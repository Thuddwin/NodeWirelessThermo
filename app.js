const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const notifier = require('./public/js/notifier');
const sqlite3 = require('sqlite3');
const db = require('./public/js/shedDB');
const io = require('socket.io')(http);

const PORT = 4000;
const myDeviceName = 'app.js'
const tempSensors = require('./public/js/sensors');
const { info } = require('console');
const tStamp = Date.now();

app.use(express.static('public'));
app.use(express.static('node_modules'));
app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, 'public/views/index.html'));
  });

  // SOCKET STUFF //
  io.on('connect', (socket) => {
    socket.emit('server_sends_message', {'message': 'send_id', 'data':'NO DATA'});
    
    socket.on('index_sends_message', (dataIn) => {
        ({message, data} = dataIn)
        console.log(`${myDeviceName}: index_sends_message: ${message}`);
        if (message === 'my_id') {
            if (data === 'index') {
                notifier.emit('server_sends_message', {'message': 'run_query', 'data': 'NO DATA'});
                notifier.emit('server_sends_message', {'message': 'start_pump', 'data': 'NO DATA'})
            }
        }
      })
    });

  // NOTIFIER STUFF //
  // SENSOR SENT //
  notifier.on('sensors_sends_message', (dataIn) => {
    ({ message, data } = dataIn);
    if(message === 'temp_update') {
        // Message for shedDB ADD CURRENT SAMPLE ONLY //
        notifier.emit('server_sends_message', {'message': 'add_temp_samples', 'data': data})
        io.emit('server_sends_message', {'message': 'temp_update', 'data': data});
    }
  });

  // SHEDDB SENT //
  notifier.on('shedDB_sends_message', (dataIn) => {
    ({ message, data } = dataIn)

    if(message === 'temp_samples_ready') {
        console.log(`${myDeviceName}: SHEDDB sends the LAST 100...`);
        // Bounce the message and data.  Target recient(s): index.html //
        io.emit('server_sends_message', {'message': 'temp_samples_ready', 'data': data});
    }
  });


    http.listen(PORT, () => {
    console.log(`Betty's Wireless Temperature Monitor listening on port: ${PORT}.`);
  })