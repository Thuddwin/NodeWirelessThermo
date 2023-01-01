const myDeviceName = 'index';
const socket = io();

socket.on('connect', () => {
    console.log('CONNEDCTED!');
});

socket.on('server_sends_message', (dataIn) => {
    ({ message, data } = dataIn);
    console.log(`${myDeviceName}: server_sends_message: ${message}`);

    // Current temps only. //
    if(message === 'temp_update') {
        ({ time_stamp, outside, pipe, shed } = data);
        ({ date_obj } = time_stamp);
        $('#titleDate').text(date_obj.date);
        $('#titleTime').text(date_obj.time);
        // OUTSIDE //
        $('#outsideCurrentElem').text(`${outside.temp}`);
        // PIPE
        $('#pipeCurrentElem').text(`${pipe.temp}`);
        // SHED
        $('#shedCurrentElem').text(`${shed.temp}`);
    } else if (message === 'temp_samples_ready') {
        ({ time_stamp, outside, pipe, shed } = data)
    
        // Data comes in as: {[outside], [pipe], [shed], [{time_stamp:date, time}]},
        // so will need to massage time_stamp before stuffing it into the graph.
        // Plan: Date tick only when day changes and is a different color.
        const xAxis = buildTimeAxis(time_stamp);

        chrt.data.datasets[0].data = outside;
        chrt.data.datasets[1].data = pipe;
        chrt.data.datasets[2].data = shed;
        chrt.data.labels = xAxis;
        chrt.update();
    } else if (message === 'send_id') {
        console.log(`${myDeviceName}: Responding to server...sending my id.`)
        socket.emit('index_sends_message', {'message': 'my_id', 'data': myDeviceName});
    }
});

const buildTimeAxis = (timeAxisIn) => {
    let timeArray = [];
    console.log(`${myDeviceName}: buildTimeAxis()...`)
    let lastDate = '';
    timeAxisIn.forEach(tObj => {
        
        if (lastDate !== tObj.date) {
            lastDate = tObj.date;
            timeArray.push(tObj.date);
        } else {
            // else push TIME
            timeArray.push(tObj.time);
        }
    });

    console.log(`${myDeviceName}: buildTimeAxis(): return:`);
    console.log(timeArray);
    
    return timeArray;
};