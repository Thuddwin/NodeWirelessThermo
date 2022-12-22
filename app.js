const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const sqlite3 = require('sqlite3');
const io = require('socket.io')(http);
const PORT = 4000;

var db = new sqlite3.Database('./public/database/temps.db');

const tStamp = Date.now();
db.run('CREATE TABLE IF NOT EXISTS temp_samples (id INTEGER PRIMARY KEY AUTOINCREMENT, sensor_name text not null, temp text, time datetime)');

let pa = path.join(__dirname, 'public');
console.log(`PATH: ${pa}`);
//app.use('static', express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.use(express.static('node_modules'));
app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, 'public/views/index.html'));
  });

  io.on('connect', (socket) => {
    socket.emit('server_sends_message', {'message':
        'olt', 'data':'34.5'});
    });

const temperturePump = () => {
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
        io.emit('server_sends_message', {'message': 'temp_update', 'data': tempPackage});
    }, 3000);
}

    temperturePump();

    http.listen(PORT, () => {
    console.log(`Betty's Wireless Temperature Monitor listening on port: ${PORT}.`);
  })