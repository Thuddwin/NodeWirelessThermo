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
const Konsole = require('./djmConsole');

const myDeviceName = 'sensors';
const k = new Konsole(myDeviceName);

k.m('global area', `loading....`);

let initializing = null;
const intervalSeconds = 30;
const PUMP_INTERVAL = intervalSeconds * 1000;
const DELTA_THRESHOLD = 0.5;
const NO_DATA = {};
const KEEPTRYING_MAX = 5;
let tempPackage = {
    'time_stamp': {'date_obj': {}},
    'temps': [
        {'name': 'outside', 'temp': null},
        {'name': 'pipe', 'temp': null},
        {'name': 'shed', 'temp': null},
    ]
};
// No need to define lastMeasurements innards because it will
// be a javascript structuredClone() of tempPackage eventually.
let lastMeasurements = {};

let returnResult = {
    'isMisfired': '',
    'errorType': '',
    'name': '',
    'dataSet': []
}

let errorPkg = {
    'error': '',
    'sensor_data': [],
    'time_stamp': ''
};

notifier.on('connect', () => {
    const fun = `on.connect`
    k.m(fun, `Sensors connected to Server Notifier.`);
});

notifier.on('server_sends_message', (dataIn) => {
    ({message, data} = dataIn)
    if (message === 'hit_pump_once') {
        pumpEngineWrapper(true)
    } else if (message === 'last_record_ready') {
        pumpEngineWrapper(false);
    }
});

let getAllTemperatures = () => {
    const allTemps = ds18b20.readAllF(2);
    if (!allTemps.length) allTemps.push({id: 'ERROR', t: 1.0});
    return allTemps;
}

const buildTimeStamp = (isShortDate) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const D = new Date();
    const day = D.getDate();
    const m = D.getMonth();
    const month = (isShortDate ? m : months[m]);
    const year = D.getFullYear();
    const currentTime = new Date().toLocaleTimeString();
    const fullDate = (isShortDate ? `${m+1}/${day}/${year}-${currentTime}` : {'date': `${month + 1} ${day}, ${year}`, 'time': currentTime});
    
    console.log(fullDate);

    return fullDate;
}

/**
 * checkForNullUndefinedInvalidDelta() - If this functions returns a true, then downstream
 * should prevent the data from being insterted into the database (which will cause a crash).
 * @param {*} tempPackage
 * @global lastMeasurements[{outside}, {pipe}, {shed}]
 * @returns Object: name: name of failing sensor, result: true: is null/undefined/xsvDelta.
 */
let checkForNullUndefinedInvalidDelta = () => {
    // NOTE: Changes to the 'temps' are REFERENCED! Changing them in this function,
    // changes the global tempPackage values.  All downstream functions will be using
    // the MODIFIED 'temps'.
    ({time_stamp, temps} = tempPackage)
    const fun = `checkForNullUndefinedInvalidDelta()`;
    returnResult.isMisfired = false;
    returnResult.errorType = '';
    returnResult.failName = '';
    returnResult.dataSet = [];

    temps.forEach(obj => {
        if(obj.temp === null || obj.temp === 'undefined') {
            returnResult.isMisfired = true;
            returnResult.failName = obj.name;
            obj.temp = 'NULL'; // <-- NOTE: THIS CHANGES THE tempPackage.temps[n].temp GLOBAL.
            returnResult.errorType = 'nullUndef';
        }
    });

    // IF NO NULLs OR UNDEFINEDs, THEN CHECK FOR INVALID DELTAs. //
    if (!returnResult.isMisfired) {
        temps.forEach((objOut, index) => {
            let lmVal = lastMeasurements.temps[index].temp;
            if (Math.abs(objOut - lmVal) > 1.0) {
                returnResult.isMisfired = true;
                returnResult.errorType = 'xsvDelta';
            }
        });
    }

    if(!returnResult.isMisfired) {
        lastMeasurements = structuredClone(tempPackage);
        k.m(fun, `DataSet GOOD! No Null/Undef/XSV Delta.`);
    }

    return returnResult;
}
/**
 * checkThreshold() - Uses globals tempPackage and lastMeasurements.
 * @returns 
 */
let checkThreshold = () => {
    const fun = `checkThreshold()`;
    k.m(fun, `This is lastMeasurements obj:`);
    console.log(lastMeasurements);
      // If this is first pass after power on then ignore the check because it will get stuck and
      // not update the UI.
      if (initializing) {
        k.m(fun, `initializing: true`);
        lastMeasurements = structuredClone(tempPackage)
        return true;
    }

    const o = tempPackage.temps[0].temp;
    const p = tempPackage.temps[1].temp;
    const s = tempPackage.temps[2].temp;
    const so = (( o === null || o === 'undefined') ? 1000 : o );
    const sp = (( p === null || p === 'undefined') ? 1000 : p );
    const ss = (( s === null || s === 'undefined') ? 1000 : s );
    const lrOutside =    Math.abs(lastMeasurements.temps[0].temp - so ) >= DELTA_THRESHOLD;
    const lrPipe =       Math.abs(lastMeasurements.temps[1].temp - sp ) >= DELTA_THRESHOLD;
    const lrShed =       Math.abs(lastMeasurements.temps[2].temp - ss ) >= DELTA_THRESHOLD;
    k.m(fun, `lrOutside: ${lrOutside}, lrPipe: ${lrPipe}, lrShed: ${lrShed}`);
    k.m(fun, `initializing: ${initializing}`);
    
    return (lrOutside || lrPipe || lrShed);
}

/**
 *  pumpEngine() - Fetches sensore readings from the hardware and attaches a timestamp.
 *  @returns tempPackage object
 */
 let pumpEngine = () => { 
     const fun = `pumpEngine()`
     const currentTimeStamp = buildTimeStamp(false); 
 
     // Data flow starts HERE.... //
     const allTemps2 = getAllTemperatures();
     tempPackage.time_stamp.date_obj = currentTimeStamp;
     tempPackage.temps[0].temp = allTemps2[0].t;  // REAL TEMP //
     tempPackage.temps[1].temp = allTemps2[1].t;  // REAL TEMP //
     tempPackage.temps[2].temp = allTemps2[2].t;  // REAL TEMP //

     return tempPackage;
 }

let giveUpCounter = null;
const pumpEngineWrapper = (initIn) => {
    initializing = initIn;
    const fun = `pumpEngingWrapper()`;
    giveUpCounter = KEEPTRYING_MAX;
    do {
        tempPackage = pumpEngine();
        const isThresholdPassed = checkThreshold(tempPackage);
        if(!isThresholdPassed) { 
            k.m(fun, `No thresholds met, IGNORING data.`)    
            return;
        }

        let isMisfiredObj = checkForNullUndefinedInvalidDelta();
        ({isMisfired, errorType, failName, dataSet} = isMisfiredObj);
        ({time_stamp,} = dataSet);
        
        if(isMisfired) {
            errorPkg.error = errorType;
            errorPkg.time_stamp = buildTimeStamp(true);
            errorPkg.sensor_data = {
                'outside': {'name': 'outside', 'temp': tempPackage.temps[0].temp},
                'pipe': {'name': 'pipe', 'temp': tempPackage.temps[1].temp},
                'shed': {'name': 'shed', 'temp': tempPackage.temps[2].temp}
            };

            k.m(fun, `pumpEngineWrapper(): isMisfired: ${isMisfired}, errorPkg`);
            k.m(fun, errorPkg);
            notifier.emit('sensors_sends_message', {'message': 'error', 'data': errorPkg})
        }
        
        if (!isMisfired) {
            lastMeasurements = structuredClone(tempPackage);
        }

        k.m(fun, `pumpEngineWrapper(): isMisfired: ${isMisfired}, giveUpCounter: ${giveUpCounter}`);
        giveUpCounter--;
    } while(isMisfired && giveUpCounter);

    k.m(fun, `pumpEngineWrapper(): out of DO LOOP..., giveUpCounter: ${giveUpCounter}`);
    // STILL MISFIRING, GIVEUPCOUNTER EXPIRED, SO GIVEUP //
    if(giveUpCounter <= 0) {
        k.m(fun, `pumpEngineWrapper(): Giving up.`);
        errorPkg.error = 'give_up';
        k.m(fun, `Sending give_up here<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`);
        k.m(fun, `This is the errorPkg:`);
        console.log(errorPkg);
        notifier.emit('sensors_sends_message', {'message': 'give_up', 'data': errorPkg})
    } else {
        k.m(fun, `pumpEngineWrapper(): Data good, send "temp_update" message...`);
        // TODO: FIX this hack where data is repackaged for DB. //
        const dbPackage = {
            time_stamp: tempPackage.time_stamp,
            'outside': {'temp': tempPackage.temps[0].temp},
            'pipe': {'temp': tempPackage.temps[1].temp},
            'shed': {'temp': tempPackage.temps[2].temp},
        }
        notifier.emit('sensors_sends_message', {'message': 'temp_update', 'data': dbPackage});
    }
}

/**
 * scanSensorsPump - An interval of PUMP_INTERVAL that sends a message to the Server to let 
 * the system know that the sensors are being scanned.
 */
const scanSensorsPump = () => {
    const fun = `scanSensorPump()`;
    k.m(fun, `Starting sensorScanPump()`);
    const pumpId = setInterval(() => {
        notifier.emit('sensors_sends_message', {'message': 'sampling_start', 'data': 'NO DATA'});
        notifier.emit('sensors_sends_message', {'message': 'get_last_record', 'data': 'NO DATA'});
    }, PUMP_INTERVAL);
}

scanSensorsPump();
