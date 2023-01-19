const { query } = require('express');
const path = require('path');
const notifier = require('../js/notifier');

const dbPath = path.join(__dirname, '../database/temps.db');
const shedDB = require('better-sqlite3')(dbPath);

const myDeviceName = 'shedDB';

// NOTE: The following data items are in this module because
//       they 'shape' the data to be retrieved even though they
//       look like they should be handled elsewhere.
const LIMIT_DEFAULT_VALUE = 60;
let get_limit = LIMIT_DEFAULT_VALUE;
let totalRecords = shedDB.prepare(`SELECT COUNT(*) AS sample_count FROM temp_samples;`).all()[0].sample_count;

let rangeStart = totalRecords - get_limit;

// Min/Max datapoints to fetch from database //
const MAX_LIMIT = 200;
const MIN_LIMIT = 10;

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
        console.log(`${myDeviceName}: insertDate(): ERROR: NULL or UNDEFINED data attempted insert into temp_samples. Ignoring.`);
        console.log(`${myDeviceName}: >>>> outside: ${outside.temp}`);
        console.log(`${myDeviceName}: >>>> pipe: ${pipe.temp}`);
        console.log(`${myDeviceName}: >>>> shed: ${shed.temp}`);
        
        return;
    }

    const insertIntoTableCmd = shedDB.prepare(`INSERT INTO temp_samples (outside_temp, pipe_temp, shed_temp, date_stamp, time_stamp) VALUES(?, ?, ?, ?, ?);`);
    insertIntoTableCmd.run(outside.temp, pipe.temp, shed.temp, date_obj.date, date_obj.time);
    runQuery().then((queryResult) => {
        notifier.emit('shedDB_sends_message', {'message': 'temp_samples_ready', 'data': queryResult});
    });
};

const runQuery = async () => {
    let o = [];
    let p = [];
    let s = [];
    let ts = [];
    let resultCount = undefined;

    totalRecords = shedDB.prepare(`SELECT COUNT(*) AS sample_count FROM temp_samples;`).all()[0].sample_count;

    const isRangeQuery = true;
    if (isRangeQuery) {
        const rangeEnd = rangeStart + get_limit;
        const prepareString = ` SELECT * FROM (SELECT * FROM temp_samples ORDER BY id DESC) WHERE id >= ${rangeStart} AND id <= ${rangeEnd} ORDER BY id ASC;`;
        console.log(`${myDeviceName}: runQuery(): prepareString:`);
        console.log(prepareString);
        resultCount = shedDB.prepare(prepareString).all();
    } else {
        resultCount = shedDB.prepare(`SELECT * FROM (SELECT * FROM temp_samples ORDER BY id DESC LIMIT ${get_limit}) ORDER BY id ASC;`).all();
    }
        
    const tempsLen = resultCount.length;
    for (let i = 0; i < tempsLen; i++ ) {
        o.push(resultCount[i].outside_temp);
        p.push(resultCount[i].pipe_temp);
        s.push(resultCount[i].shed_temp);
        ts.push({'date': resultCount[i].date_stamp, 'time': resultCount[i].time_stamp});
    };

    allTemps = {
        'outside': o,
        'pipe': p,
        'shed': s,
        'time_stamp': ts,
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
                'dataWidth': get_limit
            }
            notifier.emit('shedDB_sends_message', {'message': 'indicator_data_ready', 'data': indicatorData});
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
        console.log(`${myDeviceName}: on.server_sends_message: ${message}, data: ${data}`);
        switch(message) {
            case 'scrollLeft':
                rangeStart = (rangeStart >= 0) ? (rangeStart -= get_limit) : 0;
            break;
            case 'scrollRight':
                totalRecords = shedDB.prepare(`SELECT COUNT(*) AS sample_count FROM temp_samples;`).all()[0].sample_count;
                rangeStart = (rangeStart <= (totalRecords - get_limit)) ? (rangeStart += get_limit) : (totalRecords - get_limit);
            break;
            case 'zoomIn':
                get_limit = (get_limit > MIN_LIMIT) ? get_limit -= 10 : MIN_LIMIT;
            break;
            case 'zoomOut':
                get_limit = (get_limit < MAX_LIMIT) ? (get_limit += 10) : MAX_LIMIT;
            break;
            case 'zoomReset':
                get_limit = LIMIT_DEFAULT_VALUE;
                totalRecords = shedDB.prepare(`SELECT COUNT(*) AS sample_count FROM temp_samples;`).all()[0].sample_count;
                rangeStart = totalRecords - get_limit;
            break;
        }

        runQuery().then((queryResult) => {
            const indicatorData = {
                'totalRecords': totalRecords,
                'startIndex': rangeStart,
                'dataWidth': get_limit
            };
            notifier.emit('shedDB_sends_message', {'message': 'temp_samples_ready', 'data': queryResult});
            notifier.emit('shedDB_sends_message', {'message': 'indicator_data_ready', 'data': indicatorData});
        });
    }
})

initDB();

//////////////////////////////////////////////////////////