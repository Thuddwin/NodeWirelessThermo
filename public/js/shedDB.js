const path = require('path');
const notifier = require('../js/notifier');

const dbPath = path.join(__dirname, '../database/temps.db');
const shedDB = require('better-sqlite3')(dbPath);

const myDeviceName = 'shedDB';

// NOTE: The following data items are in this module because
//       they 'shape' the data to be retrieved even though they
//       look like they should be handled elsewhere.
const DATA_WIDTH_DEFAULT_VALUE = 60;
let data_width = DATA_WIDTH_DEFAULT_VALUE;
let index_multiplier = 1; /* How many 'data_widths' into the totalRecords we are. */
let totalRecords = shedDB.prepare(`SELECT COUNT(*) AS sample_count FROM temp_samples;`).all()[0].sample_count;
let DenbScrollLeft = false;
let DenbScrollRight = true;
let DenbZoomIn = false;
let DenbZoomOut = false;
let rangeStart = totalRecords - (data_width * index_multiplier);

// Min/Max datapoints to fetch from database //
const MAX_LIMIT = 200;
const MIN_LIMIT = 10;

const buildTimeAxis = (timeAxisIn) => {
    let lastDate = 'EMPTY STRING';
    let timeArray = [];
    timeAxisIn.forEach(tObj => {
        if ((lastDate !== tObj.date)) {
            lastDate = tObj.date;
            timeArray.push([tObj.date,tObj.time, tObj.id]);
            
        } else {
            // else push TIME only
            timeArray.push([tObj.time, tObj.id]);
        }
    });
    
    return timeArray;
};
const createTables = () => {
    // id = key, sensor_name = OUTSIDE, PIPE, SHED, 
    // temp = temperature at sensor_name,
    // time = date/time of temp taken at sensor_name
    shedDB.exec(`
        CREATE TABLE IF NOT EXISTS temp_samples (\
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            outside_temp text not null, \
            pipe_temp text not null, \
            shed_temp text not null, \
            date_stamp text, \
            time_stamp text\
        );`
    );
}

const insertData = (dataIn) => {
    ({ time_stamp, outside, pipe, shed } = dataIn);
    ({ date_obj } = time_stamp);
    if ( !(outside && pipe && shed) ) {
        console.log(`${myDeviceName}: insertData(): ERROR: NULL or UNDEFINED data attempted insert into temp_samples. Ignoring.`);
        console.log(`${myDeviceName}: >>>> outside: ${outside.temp}`);
        console.log(`${myDeviceName}: >>>> pipe: ${pipe.temp}`);
        console.log(`${myDeviceName}: >>>> shed: ${shed.temp}`);
        
        return;
    }

    const insertIntoTableCmd = shedDB.prepare(`INSERT INTO temp_samples (outside_temp, pipe_temp, shed_temp, date_stamp, time_stamp) VALUES(?, ?, ?, ?, ?);`);
    insertIntoTableCmd.run(outside.temp, pipe.temp, shed.temp, date_obj.date, date_obj.time);

    totalRecords = shedDB.prepare(`SELECT COUNT(*) AS sample_count FROM temp_samples;`).all()[0].sample_count;
    rangeStart = totalRecords - (data_width * index_multiplier);

    runQuery().then((queryResult) => {
        notifier.emit('shedDB_sends_message', {'message': 'temp_samples_ready', 'data': queryResult});
    });
};

const runQuery = async () => {
    let o = [];
    let p = [];
    let s = [];
    let ts = [];
    let resultTemps = undefined;

    // NOTE: Truth IF rangeStart is truth. BROKEN HERE: Rangestart isn't being updated...
    const rangeEnd = rangeStart + data_width;
    const prepareString = `SELECT * FROM (SELECT * FROM temp_samples ORDER BY id DESC) \
    WHERE id >= ${rangeStart} AND id <= ${rangeEnd} ORDER BY id ASC;`;
    resultTemps = shedDB.prepare(prepareString).all();

    const tempsLen = resultTemps.length;
    for (let i = 0; i < tempsLen; i++ ) {
        o.push(resultTemps[i].outside_temp);
        p.push(resultTemps[i].pipe_temp);
        s.push(resultTemps[i].shed_temp);
        ts.push(
            {
                'id': resultTemps[i].id,
                'date': resultTemps[i].date_stamp, 
                'time': resultTemps[i].time_stamp
            });
    };

    const adjustedTimestamp = buildTimeAxis(ts);
    allTemps = {
        'outside': o,
        'pipe': p,
        'shed': s,
        'time_stamp': adjustedTimestamp,
        'sample_count': totalRecords
    };

    return allTemps;
}

const getLastRecord = async () => {
    let lastRecord = shedDB.prepare('select * from temp_samples order by id desc limit 1;').all();

    return lastRecord;
}

const getMinMaxPipeTemps = async () => {
    let minTemps = shedDB.prepare(`SELECT min(pipe_temp) AS pipe_temp, outside_temp, shed_temp, date_stamp, time_stamp from temp_samples;`).all();
    let maxTemps = shedDB.prepare(`SELECT max(pipe_temp) AS pipe_temp, outside_temp, shed_temp, date_stamp, time_stamp from temp_samples;`).all();
    let minMaxTemps = {
        'min': minTemps[0],
        'max': maxTemps[0]
    };

    return minMaxTemps;
}

const initDB = async () => {
    createTables();
}

notifier.on('server_sends_message', (dataIn) => {
    ({ message, data } = dataIn);
    if( message == 'add_temp_samples') {
        insertData(data);
    } else if (message === 'run_query') {
        runQuery().then((queryResult) => {
            notifier.emit('shedDB_sends_message', {'message': 'temp_samples_ready', 'data': queryResult});
            const indicatorData = {
                'totalRecords': totalRecords,
                'startIndex': rangeStart,
                'dataWidth': data_width
            };
            const buttonStates = {
                'DenbScrollLeft': DenbScrollLeft,
                'DenbScrollRight': DenbScrollRight,
                'DenbZoomIn': DenbZoomIn,
                'DenbZoomOut': DenbZoomOut
            };
            notifier.emit('shedDB_sends_message', {'message': 'indicator_data_ready', 'data': indicatorData});
            notifier.emit('shedDB_sends_message', {'message': 'button_states_ready', 'data': buttonStates});
        });
    } else if (message === 'get_min_max') {
        getMinMaxPipeTemps().then((queryResult) => {
            notifier.emit('shedDB_sends_message', {'message': 'min_max_ready', 'data': queryResult});
        })
    } else if (message === 'get_last_record') {
        getLastRecord().then((lastRecord) => {
            notifier.emit('shedDB_sends_message', {'message': 'last_record_ready', 'data': lastRecord[0]});
        });
    } else if (['scrollLeft', 'zoomIn', 'zoomReset', 'zoomOut', 'scrollRight'].includes(message)) {
        let max_data_widths = Math.round(totalRecords/data_width);
        switch(message) {
            case 'scrollLeft':
                index_multiplier = (index_multiplier < max_data_widths) ? ++index_multiplier : max_data_widths;
            break;
            case 'scrollRight':
                index_multiplier = (index_multiplier > 1) ? --index_multiplier : 1;
            break;
            case 'zoomIn':
                data_width = (data_width > MIN_LIMIT) ? data_width -= 10 : MIN_LIMIT;

            break;
            case 'zoomOut':
                data_width = (data_width < MAX_LIMIT) ? (data_width += 10) : MAX_LIMIT;
            break;
            case 'zoomReset':
                data_width = DATA_WIDTH_DEFAULT_VALUE;
                index_multiplier = 1;
                rangeStart = totalRecords - (data_width * index_multiplier);

            break;
        }
        DenbScrollLeft = (index_multiplier === max_data_widths) ? true : false;
        DenbScrollRight = (index_multiplier === 1) ? true : false;
        DenbZoomIn = (data_width === MIN_LIMIT) ? true : false;
        DenbZoomOut = (data_width === MAX_LIMIT) ? true : false;

        rangeStart = totalRecords-(index_multiplier*data_width);

        runQuery().then((queryResult) => {
            const indicatorData = {
                'totalRecords': totalRecords,
                'startIndex': rangeStart,
                'dataWidth': data_width
            };
            const buttonStates = {
                'DenbScrollLeft': DenbScrollLeft,
                'DenbScrollRight': DenbScrollRight,
                'DenbZoomIn': DenbZoomIn,
                'DenbZoomOut': DenbZoomOut
            }
            notifier.emit('shedDB_sends_message', {'message': 'temp_samples_ready', 'data': queryResult});
            notifier.emit('shedDB_sends_message', {'message': 'indicator_data_ready', 'data': indicatorData});
            notifier.emit('shedDB_sends_message', {'message': 'button_states_ready', 'data': buttonStates});
        });
    }
})

initDB();

//////////////////////////////////////////////////////////