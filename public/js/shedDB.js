const path = require('path');
const notifier = require('../js/notifier');

const dbPath = path.join(__dirname, '../database/temps.db');
const shedDB = require('better-sqlite3')(dbPath);

const myDeviceName = 'shedDB';

const createTables = () => {
    // id = key, sensor_name = OUTSIDE, PIPE, SHED, 
    // temp = temperature at sensor_name,
    // time = date/time of temp taken at sensor_name
    console.log(`${myDeviceName}: createTables()...`);

    shedDB.exec(`
        CREATE TABLE IF NOT EXISTS temp_samples (\
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            sensor_name text not null, \
            temp text, \
            date_stamp text, \
            time_stamp text\
        );`
    );
}

const insertData = (dataIn) => {
    ({ time_stamp, outside, pipe, shed } = dataIn);
    ({ date_obj } = time_stamp);
    console.log(`${myDeviceName}: insertData()...`)
    console.log(dataIn);
    const insertIntoTableCmd = shedDB.prepare(`INSERT INTO temp_samples (sensor_name, temp, date_stamp, time_stamp) VALUES(?, ?, ?, ?);`);
    insertIntoTableCmd.run(outside.name, outside.temp, date_obj.date, date_obj.time);
    insertIntoTableCmd.run(pipe.name, pipe.temp, date_obj.date, date_obj.time);
    insertIntoTableCmd.run(shed.name, shed.temp, date_obj.date, date_obj.time);
    runQuery().then((result) => {
        notifier.emit('shedDB_sends_message', {'message': 'all_temps', 'data': result});
    })
};

const runQuery = async () => {
    console.log(`${myDeviceName}: runQuery()...`);
    let allTemps = shedDB.prepare('SELECT * FROM temp_samples;').all();

    return allTemps;
}

const initDB = async () => {
    createTables();
}

notifier.on('server_sends_message', (dataIn) => {
    ({ message, data } = dataIn);
    if( message == 'add_temp_samples') {
        insertData(data);
    }
})

initDB();

//////////////////////////////////////////////////////////