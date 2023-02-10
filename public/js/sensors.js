/**
 * This module handles the temperature sensors connected to the GPIO.
 * The engine is an interval that begins by sending a notification to the Server
 * that it needs the last temperature sample from the database.  When the data is
 * received, last data is compared to this data to see if the minimum delta is met
 * on any of the sensors. If not, the sample is ignored.  If so, the data is added to
 * the database, via notification to the server.
 * If a sensor misfires, a recursive call to pumpEngine() will try up to RECURSE_MAX
 * times to obtain valid data. If valid data still cannot be obtained, the ERROR
 * indicator on the UI is illuminated and an ERROR is thrown.  This will cause the 
 * program to halt.
 */
const notifier = require('./notifier');
const ds18b20 = require('ds18b20-raspi');
const { ERROR } = require('sqlite3');
const myDeviceName = 'sensors';

console.log(`${myDeviceName}: loading....`);

const intervalSeconds = 30;
const PUMP_INTERVAL = intervalSeconds * 1000;
const DELTA_THRESHOLD = 0.5;
const NO_DATA = {};
const RECURSE_MAX = 3;
let sensor_malfunction = false;
let isMisfiredObj = {};

notifier.on('connect', () => {
    console.log(`${myDeviceName}: Sensors connected to Server Notifier.`);
});

notifier.on('server_sends_message', (dataIn) => {
    ({message, data} = dataIn)
    if (message === 'hit_pump_once') {
        pumpEngine(NO_DATA, RECURSE_MAX, true)
    } else if (message === 'last_record_ready') {
        pumpEngine(data, RECURSE_MAX, false);
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

/**
 * checkForNullUndefined()
 * @param {*} arrayIn 
 * @returns Object: name: name of failing sensor, result: true: is null or undefine.
 */
let checkForNullUndefined = (arrayIn) => {
    let result = false;
    let failName = '';
    
    for (let i=0; i<arrayIn.length; i++ ) {
        if (arrayIn[i].temp === null || arrayIn[i].temp === 'undefined') {
            result = true;
            failName = arrayIn[i].name;
            arrayIn[i].temp = 'NULL'
        } 
    };

    const returnResult = {
        'result': result,
        'name': failName || '',
        'data_set': arrayIn
    }

    return returnResult;
}

// NOTE: Moving temp declaraions outside the pumpEngine so old values will
//       not be popped when exiting a level of recurse.
let outsideTemp = null;
let pipeTemp = null;
let shedTemp = null;
let allTemps2 = [];
const pumpEngine = (lastRecordIn, recursesRemaining, initializing) => {
    const recurseCounter = recursesRemaining - 1;
    allTemps2 = getAllTemperatures();
    outsideTemp =   allTemps2[0].t;   // REAL TEMP //
    pipeTemp =      allTemps2[1].t;   // REAL TEMP //
    shedTemp =      allTemps2[2].t;   // REAL TEMP //
    console.log(`${myDeviceName}: pumpEngine():getAllTemperatures():result:`);
    console.log(allTemps2);
    // Sometimes a sensor will misfire. Check for null or undefined data. //
    const checkArray = [
        {'name': 'outside', 'temp': outsideTemp},
        {'name': 'pipe', 'temp': pipeTemp},
        {'name': 'shed', 'temp': shedTemp},
    ]
    
    isMisfiredObj = checkForNullUndefined(checkArray);
    isMisfired = isMisfiredObj.result;
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    let error_package  = {
        'error': '',
        'sensor_data': checkArray,
        'time_stamp': `${date}-${time}`
    }

    if (isMisfired && (recurseCounter >= 1)) {
        console.log(`${myDeviceName}: pumpEngine(): READINGS: outside: ${outsideTemp}, pipe: ${pipeTemp}, shed:${shedTemp}`)
        console.log(`${myDeviceName}: pumpEngine(): ERROR: A sensor misfired. Trying again....`);
        error_package.error = 'misfire';
        notifier.emit('sensors_sends_message', {'message': 'error', 'data': error_package})
        // RECURSE...
        pumpEngine(lastRecordIn, recurseCounter, initializing);
    } else if (isMisfired && !recurseCounter) {
        // Give up. It has been RECURSE_MAX attempts. A sensor, or sensors, is malfunctioning.
        // Message to server will be sent at the end of this module.  The server will decide what 
        // to do.
        console.log(`${myDeviceName}: pumpEngine(): ERROR: A sensor misfired. Ignoring this sample.`);
        error_package.error = 'give_up';
        notifier.emit('sensors_sends_mesaage', {'message': 'error', 'data': error_package})
        sensor_malfunction = true;
    }

    // Reduce data storage: Check to see if any sensor value meets the minimum delta threshold. //
    // Logic evaluates to TRUE if the threshold is met.
    const lrOutside = Math.abs(lastRecordIn.outside_temp - outsideTemp) >= DELTA_THRESHOLD;
    const lrPipe = Math.abs(lastRecordIn.pipe_temp - pipeTemp) >= DELTA_THRESHOLD;
    const lrShed = Math.abs(lastRecordIn.shed_temp - shedTemp) >= DELTA_THRESHOLD;
    
    // If this is first pass after power on, then ignore because we want to update the UI.
    if (!initializing) {
        if ( !(lrOutside || lrPipe || lrShed) ) {

            // None of the sensors' data has met the minimum threshold of +/-0.5 deg F so ignore. //

            return;
        }
    }

    const currentTimeStamp = buildTimeStamp();

    const tempPackage = {
        'time_stamp': {'date_obj': currentTimeStamp},
        'outside': {'name': 'outside', 'temp': outsideTemp},
        'pipe': {'name': 'pipe', 'temp': pipeTemp},
        'shed': {'name': 'shed', 'temp': shedTemp},
    }

    if (!sensor_malfunction) {
        notifier.emit('sensors_sends_message', {'message': 'temp_update', 'data': tempPackage});
    } else {
        // Have Server throw error. //
        notifier.emit('sensors_sends_message', {'message': 'sensor_malfunction', 'data': isMisfiredObj.name});
        sensor_malfunction = false;
    }
}

const sensorsReadPump = () => {
    console.log(`${myDeviceName}: Starting sensorScanPump()`);
    const pumpId = setInterval(() => {
        notifier.emit('sensors_sends_message', {'message': 'sampling_start', 'data': 'NO DATA'});
        notifier.emit('sensors_sends_message', {'message': 'get_last_record', 'data': 'NO DATA'});
    }, PUMP_INTERVAL);
}

sensorsReadPump();
