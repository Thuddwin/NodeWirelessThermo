const notifier = require('./notifier');
const ds18b20 = require('ds18b20-raspi');
const myDeviceName = 'sensors';

console.log(`${myDeviceName}: loading....`);

let sensorIDs = [];
const durationSeconds = 30;
const pumpDuration = durationSeconds * 1000;

notifier.on('connect', () => {
    console.log(`${myDeviceName}: Sensor connected to Server Notifier.`);
});

notifier.on('server_sends_message', (dataIn) => {
    ({message, data} = dataIn)
    if (message === 'start_pump') {
        pumpEngine();
        sensorScanPump();
    }
});


let getAllTemperatures = () => {
    const allTemps = ds18b20.readAllF(2);
    console.log('ALLTEMPS: ');
    if (!allTemps.length) allTemps.push({id: 'ERROR', t: 1.0});
    console.log(allTemps)
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

    console.log(`${myDeviceName}: COMPUTED TIMESTAMP: ${fullDate} - ${currentTime}`);
    return {'date': fullDate, 'time': currentTime};
}

const pumpEngine = () => {
    let allTemps2 = getAllTemperatures();
    let outsideTemp =   allTemps2[0].t; // REAL TEMP //
    let pipeTemp =      allTemps2[1].t; // REAL TEMP //
    let shedTemp =      allTemps2[2].t; // REAL TEMP //

    const currentTimeStamp = buildTimeStamp();

    const tempPackage = {
        'time_stamp': {'date_obj': currentTimeStamp},
        'outside': {'name': 'outside', 'temp': outsideTemp},
        'pipe': {'name': 'pipe', 'temp': pipeTemp},
        'shed': {'name': 'shed', 'temp': shedTemp},
    }
    console.log(`${myDeviceName}: Sending data...`);
    notifier.emit('sensors_sends_message', {'message': 'temp_update', 'data': tempPackage});
}

const sensorScanPump = () => {
    console.log(`${myDeviceName}: Starting sensorScanPump()`);
    const pumpId = setInterval(() => {
        pumpEngine();
    }, pumpDuration);
}
