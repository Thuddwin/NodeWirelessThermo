const notifier = require('./notifier');
const myDeviceName = 'sensors';

console.log(`${myDeviceName}: loading....`);

notifier.on('connect', () => {
    console.log(`${myDeviceName}: Sensor connected to Server Notifier.`);
});

notifier.on('server_sends_message', (dataIn) => {
    // Do some stuff....maybe. //
});

const buildTimeStamp = () => {
    // const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const D = new Date();
    const day = D.getDay();
    const month = months[D.getMonth()];
    const year = D.getFullYear();
    const fullDate = `${month} ${day}, ${year}`;
    const currentTime = new Date().toLocaleTimeString();

    console.log(`${myDeviceName}: COMPUTED TIMESTAMP: ${fullDate} - ${currentTime}`);
    return {'date': fullDate, 'time': currentTime};
}

const sensorScanPump = () => {
    console.log(`${myDeviceName}: Starting sensorScanPump()`)
    const pumpId = setInterval(() => {
        // MOCK DATA HERE - To be replaced by incoming data from sensors. //
        let oTemp = Math.floor(Math.random() * 160.0 ); // Outside Temp //
        let pTemp = Math.floor(Math.random() * 160.0 ); // Pipe Temp //
        let sTemp = Math.floor(Math.random() * 160.0 ); // Inside Shed Temp //
        let outsideTemp = oTemp.toFixed(1);
        let pipeTemp = pTemp.toFixed(1);
        let shedTemp = sTemp.toFixed(1);
        ////////////////////////////////////////////////////////////////////

        const currentTimeStamp = buildTimeStamp();

        const tempPackage = {
            'time_stamp': {'date_obj': currentTimeStamp},
            'outside': {'name': 'outside', 'temp': outsideTemp},
            'pipe': {'name': 'pipe', 'temp': pipeTemp},
            'shed': {'name': 'shed', 'temp': shedTemp},
        }
        console.log(`${myDeviceName}: Sending data...`);
        notifier.emit('sensors_sends_message', {'message': 'temp_update', 'data': tempPackage});
    }, 5000);
}

sensorScanPump();

