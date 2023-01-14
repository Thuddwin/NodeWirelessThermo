const { query } = require('express');
const path = require('path');
const notifier = require('../js/notifier');

const dbPath = path.join(__dirname, '../database/temps.db');
const shedDB = require('better-sqlite3')(dbPath);

const myDeviceName = 'shedDB';
const GET_LIMIT = 50;

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

    let temps100 = shedDB.prepare(`SELECT * FROM (SELECT * FROM temp_samples ORDER BY id DESC LIMIT ${GET_LIMIT}) ORDER BY id ASC;`).all();
    let sampleCount = shedDB.prepare(`SELECT COUNT(*) AS sample_count FROM temp_samples;`).all();
    const tempsLen = temps100.length;
    for (let i = 0; i < tempsLen; i++ ) {
        o.push(temps100[i].outside_temp);
        p.push(temps100[i].pipe_temp);
        s.push(temps100[i].shed_temp);
        ts.push({'date': temps100[i].date_stamp, 'time': temps100[i].time_stamp});
    };

    allTemps = {
        'outside': o,
        'pipe': p,
        'shed': s,
        'time_stamp': ts,
        'sample_count': sampleCount[0]
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
        });
    } else if (message === 'get_min_max') {
        getMinMaxPipeTemps().then((queryResult) => {
            notifier.emit('shedDB_sends_message', {'message': 'min_max_ready', 'data': queryResult});
        })
    } else if (message === 'get_last_record') {
        getLastRecord().then((lastRecord) => {
            notifier.emit('shedDB_sends_message', {'message': 'last_record_ready', 'data': lastRecord[0]});
        });
    }
})

initDB();

//////////////////////////////////////////////////////////