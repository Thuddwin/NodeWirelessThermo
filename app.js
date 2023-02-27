const express = require('express');
const Konsole = require('./public/js/djmConsole');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const notifier = require('./public/js/notifier');
const sqlite3 = require('sqlite3');
const db = require('./public/js/shedDB');
const io = require('socket.io')(http);
const rbt = require('./public/js/rebooter');

const PORT = 4000;
const myDeviceName = 'app.js'
const tempSensors = require('./public/js/sensors');
const tStamp = Date.now();

const k = new Konsole(myDeviceName);

console.clear();

app.use(express.static('public'));
app.use(express.static('node_modules'));
app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, 'public/views/index.html'));
  });

  // SOCKET STUFF //
  io.on('connect', (socket) => {
    const fun = `io.on.connect`;
    socket.emit('server_sends_message', {'message': 'send_id', 'data':'NO DATA'});
    
    socket.on('index_sends_message', (dataIn) => {
        ({message, id, data} = dataIn)
        k.m(fun, `on.index_sends_message: id: ${id}`);
        if (message === 'my_id') {
            if (data === 'index') {
                notifier.emit('server_sends_message', {'message': 'run_query', 'data': 'NO DATA'});
                notifier.emit('server_sends_message', {'message': 'hit_pump_once', 'data': 'NO DATA'})
            }
        } else if (message === 'get_min_max') {
            // Notify shedDB.js
            notifier.emit('server_sends_message', {'message': 'get_min_max', 'id': id, 'data': 'NO DATA'});
        } else if (['scrollLeft', 'zoomIn', 'zoomReset', 'zoomOut', 'scrollRight'].includes(message)) {
            // Notify shedDB.js
            notifier.emit('server_sends_message', {'message': message, 'id': id, 'data': data});
        } else if (message === 'request_error_list') {
            // Notify shedDB.js
            notifier.emit('server_sends_message', {'message': 'request_error_list', 'id': id, 'data': 'NO DATA'});
        }
      })
    });

  // NOTIFIER STUFF //
  // SENSOR SENT //
  notifier.on('sensors_sends_message', (dataIn) => {
    const fun = 'sensors_sends_message';
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
    } else if (message === 'error') {
        ({error, sensor_data, time_stamp} = data)
        // Send message to UI before rebooting...
        // WAIT: io.emit('server_sends_message', {'message': 'sensor_malfunction', 'data': data});
        // Send message DB before rebooting...
        if (['nullUndef', 'xsvDelta'].includes(error)) {
            notifier.emit('server_sends_message', {'message': 'error', 'data': data});
        }
    } else if (message === 'give_up') {
        // REPLACE NULLs with -500; TODO: <-- WHY NOT -500 IN FIRST PLACE????
        k.m(fun, `This is data that was sent from sensors at 'give_up.`);
        console.log(data);
        let o = data.sensor_data.outside.temp;
        let p = data.sensor_data.pipe.temp;
        let s = data.sensor_data.shed.temp;
        o = (o === 'NULL' ? -500 : o);
        p = (p === 'NULL' ? -500 : p);
        s = (s === 'NULL' ? -500 : s);
        // Tell shedDB to save error...
        k.m(fun, `Sending give_up message...`)
        notifier.emit('server_sends_message', {'message': 'give_up', 'data': data});
    } 
  });

  // SHEDDB SENT //
  notifier.on('shedDB_sends_message', (dataIn) => {
    ({ message, id, data } = dataIn)
    const fun = `shedDB_sends_message`;
    if(message === 'temp_samples_ready') {
        // Bounce the message and data.  Target recipient(s): index.html //
        io.emit('server_sends_message', {'message': 'temp_samples_ready', 'id': id, 'data': data});
    } else if (message === 'min_max_ready') {
        // Bounce the message and data.  Target recient(s): index.html //
        io.emit('server_sends_message', {'message': 'min_max_temps_ready', 'id': id, 'data': data})
    } else if (message === 'last_record_ready') {
        notifier.emit('server_sends_message', {'message': 'last_record_ready', 'data': data});
    } else if (message === 'indicator_data_ready') {
        io.emit('server_sends_message', {'message': 'indicator_data_ready', 'id': id, 'data': data});
    } else if (message === 'button_states_ready') {
        io.emit('server_sends_message', {'message': 'button_states_ready', 'id': id, 'data': data}); 
    } else if (message === 'error_list_ready') {
        io.emit('server_sends_message', {'message': 'error_list_ready', 'id': id, 'data': data});
    } else if (message === 'give_up_complete') {
        // SEND LAST GASP ERROR LIST TO UI //
        io.emit('server_sends_message', {'message': 'error_list_ready', 'id': id, 'data': data});
        k.m(fun, `SENDING REBOOT NOW>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
        // SEND REBOOT COMMAND HERE //
        rbt.rebootRPi(); 
    }
  });


    http.listen(PORT, () => {
    k.m(``, `Betty's Wireless Temperature Monitor listening on port: ${PORT}.`);
  })