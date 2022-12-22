const notifier = require('./notifier');
const myDeviceName = 'sensors';

console.log(`${myDeviceName}: loading....`);

notifier.on('connect', () => {
    console.log(`${myDeviceName}: Sensor connected to Server Notifier.`);
});

notifier.on('server_sends_message', (dataIn) => {
    // Do some stuff....maybe. //
});

const sensorScanPump = () => {
    console.log(`${myDeviceName}: Starting sensorScanPump()`)
    const pumpId = setInterval(() => {
        let oTemp = Math.floor(Math.random() * 160.0 ); // Outside Temp //
        let pTemp = Math.floor(Math.random() * 160.0 ); // Pipe Temp //
        let sTemp = Math.floor(Math.random() * 160.0 ); // Inside Shed Temp //
        let outsideTemp = oTemp.toFixed(1);
        let outsideLowTemp = (oTemp - 20.0).toFixed(1);
        let outsideHighTemp = (oTemp + 10.0).toFixed(1);
        let pipeTemp = pTemp.toFixed(1);
        let shedTemp = sTemp.toFixed(1);

        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();
        const tempPackage = {
            'timeStamp': {'date': currentDate, 'time': currentTime},
            'outside': {
                'low': { 'temp': outsideLowTemp, 'date': 'Dec 12, 2022', 'time': '03:43 AM' },
                'current': { 'temp': outsideTemp },
                'high': { 'temp': outsideHighTemp, 'date': 'Dec 15, 2022', 'time': '5:22 PM' },
            },
            'pipe': {
                'low': { 'temp': pipeTemp - 20.0, 'date': 'Dec 12, 2022', 'time': '01:03 AM' },
                'current': { 'temp': pipeTemp },
                'high': { 'temp': pipeTemp + 10.0, 'date': 'Dec 15, 2022', 'time': '6:04 PM' },
            },
            'shed': {
                'low': { 'temp': shedTemp - 20.0, 'date': 'Dec 12, 2022', 'time': '01:43 AM' },
                'current': { 'temp': shedTemp },
                'high': { 'temp': shedTemp + 10.0, 'date': 'Dec 15, 2022', 'time': '6:22 PM' },
            },
        }
        console.log(`${myDeviceName}: Sending data...`);
        notifier.emit('sensors_sends_message', {'message': 'data_update', 'data': tempPackage});
    }, 3000);
}

sensorScanPump();

