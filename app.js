const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const notifier = require('./public/js/notifier');
const sqlite3 = require('sqlite3');
const db = require('./public/js/shedDB');
const io = require('socket.io')(http);

const PORT = 4000;

const tempSensors = require('./public/js/sensors');
const tStamp = Date.now();

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
    if(message === 'temp_update') {
        // Message for shedDB ADD CURRENT SAMPLE ONLY //
        notifier.emit('server_sends_message', {'message': 'add_temp_samples', 'data': data})
        io.emit('server_sends_message', {'message': 'temp_update', 'data': data});
    } else if (message === 'all_temps') {
        // Message for  index.html for CURRENT SAMPLE ONLY //
    }
  });


    http.listen(PORT, () => {
    console.log(`Betty's Wireless Temperature Monitor listening on port: ${PORT}.`);
  })