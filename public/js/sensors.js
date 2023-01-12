/**
 * This module handles the temperature sensors connected to the GPIO.
 * The engine is an interval that begins by sending a notification to the Server
 * that it needs the last temperature sample from the database.  When the data is
 * received, last data is compared to this data to see if the minimum delta is met
 * on any of the sensors. If not, the sample is ignored.  If so, the data is added to
 * the database, via notification to the server.
 */
const notifier = require('./notifier');
const ds18b20 = require('ds18b20-raspi');
const myDeviceName = 'sensors';

console.log(`${myDeviceName}: loading....`);

const durationSeconds = 30;
const PUMP_DURATION = durationSeconds * 1000;
const DELTA_THRESHOLD = 0.5;

notifier.on('connect', () => {
    console.log(`${myDeviceName}: Sensor connected to Server Notifier.`);
});

notifier.on('server_sends_message', (dataIn) => {
    ({message, data} = dataIn)
    if (message === 'hit_pump_once') {
        pumpEngineOnce();
    } else if (message === 'last_record_ready') {
        pumpEngine(data);
    }
});


let getAllTemperatures = () => {
    const allTemps = ds18b20.readAllF(2);
    if (!allTemps.length) allTemps.push({id: 'ERROR', t: 1.0});
    return allTemps;
}

const buildTimeStamp = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const D = new Date();
    const day = D.getDate();
    const month = months[D.getMonth()];
    const year = D.getFullYear();
    const fullDate = `${month} ${day}, ${year}`;
    const currentTime = new Date().toLocaleTimeString();

    return {'date': fullDate, 'time': currentTime};
}

const pumpEngineOnce = () => {
    notifier.emit('sensors_sends_message', {'message': 'sampling_start', 'data': 'NO DATA'});
    const allTemps2 = getAllTemperatures();
    const outsideTemp =   allTemps2[0].t; // REAL TEMP //
    const pipeTemp =      allTemps2[1].t; // REAL TEMP //
    const shedTemp =      allTemps2[2].t; // REAL TEMP //

    const currentTimeStamp = buildTimeStamp();

    const tempPackage = {
        'time_stamp': {'date_obj': currentTimeStamp},
        'outside': {'name': 'outside', 'temp': outsideTemp},
        'pipe': {'name': 'pipe', 'temp': pipeTemp},
        'shed': {'name': 'shed', 'temp': shedTemp},
    }

    notifier.emit('sensors_sends_message', {'message': 'temp_update', 'data': tempPackage});
}

/**
 * checkForNullUndefined()
 * @param {*} varIn 
 * @returns boolean: false: Data is valid. true: is null or undefine.
 */
let checkForNullUndefined = (varIn) => {
    if (varIn == null || varIn === 'undefined') {
        return true;
    }

    return false;
}

const pumpEngine = (lastRecordIn) => {
    const allTemps2 = getAllTemperatures();
    const outsideTemp =   allTemps2[0].t; // REAL TEMP //
    const pipeTemp =      allTemps2[1].t; // REAL TEMP //
    const shedTemp =      allTemps2[2].t; // REAL TEMP //

    // Sometimes a sensor will misfire. Check for null or undefined data. //
    if (checkForNullUndefined(outsideTemp) || checkForNullUndefined(pipeTemp) || checkForNullUndefined(shedTemp)) {
        console.log(`${myDeviceName}: pumpEngine(): ERROR: A sensor misfired. Ignoring this sample.`);
        return;
    }

    // Reduce data storage: Check to see if any sensor value meets the minimum delta threshold. //
    const lrOutside = Math.abs(lastRecordIn.outside_temp - outsideTemp) >= DELTA_THRESHOLD;
    const lrPipe = Math.abs(lastRecordIn.pipe_temp - pipeTemp) >= DELTA_THRESHOLD;
    const lrShed = Math.abs(lastRecordIn.shed_temp - shedTemp) >= DELTA_THRESHOLD;
    if ( !(lrOutside || lrPipe || lrShed) ) {

        // None of the sensors' data has met minimum threshold so ignore. //

        return;
    }

    const currentTimeStamp = buildTimeStamp();

    const tempPackage = {
        'time_stamp': {'date_obj': currentTimeStamp},
        'outside': {'name': 'outside', 'temp': outsideTemp},
        'pipe': {'name': 'pipe', 'temp': pipeTemp},
        'shed': {'name': 'shed', 'temp': shedTemp},
    }

    notifier.emit('sensors_sends_message', {'message': 'temp_update', 'data': tempPackage});
}

const sensorScanPump = () => {
    console.log(`${myDeviceName}: Starting sensorScanPump()`);
    const pumpId = setInterval(() => {
        notifier.emit('sensors_sends_message', {'message': 'sampling_start', 'data': 'NO DATA'});
        notifier.emit('sensors_sends_message', {'message': 'get_last_record', 'data': 'NO DATA'});
    }, PUMP_DURATION);
}

sensorScanPump();
