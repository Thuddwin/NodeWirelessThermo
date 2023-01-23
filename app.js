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
        if (message === 'my_id') {
            if (data === 'index') {
                notifier.emit('server_sends_message', {'message': 'run_query', 'data': 'NO DATA'});
                notifier.emit('server_sends_message', {'message': 'hit_pump_once', 'data': 'NO DATA'})
            }
        } else if (message === 'get_min_max') {
            notifier.emit('server_sends_message', {'message': 'get_min_max', 'data': 'NO DATA'});
        } else if (['scrollLeft', 'zoomIn', 'zoomReset', 'zoomOut', 'scrollRight'].includes(message)) {
            // Notify shedDB.js
            notifier.emit('server_sends_message', {'message': message, 'data': data});
        }
      })
    });

  // NOTIFIER STUFF //
  // SENSOR SENT //
  notifier.on('sensors_sends_message', (dataIn) => {
    ({ message, data } = dataIn);
    if(message === 'temp_update') {
        /* Bounce message for shedDB to ADD CURRENT SAMPLE ONLY. shedDB will send
           a 'temp_samples_ready' message after data has been stored and another set
           of arrays is prepared for the Graph.
        */
        notifier.emit('server_sends_message', {'message': 'add_temp_samples', 'data': data})
        // Sending to directly to index to update Cards and Timestamp //
        io.emit('server_sends_message', {'message': 'temp_update', 'data': data});
    } else if (message === 'sampling_start') {
        // Sensor module is just letting the world know that its scan pump is working. //
        io.emit('server_sends_message', {'message': 'sampling_start', 'data': 'NO DATA'});
    
    } else if (message === 'get_last_record') {
        notifier.emit('server_sends_message', {'message': 'get_last_record', 'data': 'NO DATA'});
    } else if (message === 'sensor_malfunction') {
        io.emit('server_sends_message', {'message': 'sensor_malfunction', 'data': data});
        const errMsg = `${myDeviceName}: Sensor "${data}" is malfunctioning. Program halted. Service required.`;
        throw new Error(errMsg);
    }
  });

  // SHEDDB SENT //
  notifier.on('shedDB_sends_message', (dataIn) => {
    ({ message, data } = dataIn)
    if(message === 'temp_samples_ready') {
        // Bounce the message and data.  Target recipient(s): index.html //
        io.emit('server_sends_message', {'message': 'temp_samples_ready', 'data': data});
    } else if (message === 'min_max_ready') {
        // Bounce the message and data.  Target recient(s): index.html //
        io.emit('server_sends_message', {'message': 'min_max_temps_ready', 'data': data})
    } else if (message === 'last_record_ready') {
        notifier.emit('server_sends_message', {'message': 'last_record_ready', 'data': data});
    } else if (message === 'indicator_data_ready') {
        console.log(`${myDeviceName}: on.indicator_data_ready: message: ${message}, data:`);
        console.log(data);
        io.emit('server_sends_message', {'message': 'indicator_data_ready', 'data': data});
    } else if (message === 'button_states_ready', {'message': 'button_states_ready', 'data': data});
  });


    http.listen(PORT, () => {
    console.log(`Betty's Wireless Temperature Monitor listening on port: ${PORT}.`);
  })