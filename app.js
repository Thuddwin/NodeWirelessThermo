const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const notifier = require('./public/js/notifier');
const sqlite3 = require('sqlite3');
const io = require('socket.io')(http);
const PORT = 4000;

const tempSensors = require('./public/js/sensors');

var db = new sqlite3.Database('./public/database/temps.db');

const tStamp = Date.now();
db.run('CREATE TABLE IF NOT EXISTS temp_samples (id INTEGER PRIMARY KEY AUTOINCREMENT, sensor_name text not null, temp text, time datetime)');

app.use(express.static('public'));
app.use(express.static('node_modules'));
app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, 'public/views/index.html'));
  });

  // SOCKET STUFF //
  io.on('connect', (socket) => {
    socket.emit('server_sends_message', {'message':
        'olt', 'data':'34.5'});
    });

  // NOTIFIER STUFF //
  notifier.on('sensors_sends_message', (dataIn) => {
    ({ message, data } = dataIn);
    if(message === 'data_update') {
        io.emit('server_sends_message', {'message': 'temp_update', 'data': data});
        console.log('Server received data package from Sensors.');
    }
  });


    http.listen(PORT, () => {
    console.log(`Betty's Wireless Temperature Monitor listening on port: ${PORT}.`);
  })