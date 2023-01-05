const myDeviceName = 'index';
const socket = io();

socket.on('connect', () => {
    console.log('CONNEDCTED!');
});

socket.on('server_sends_message', (dataIn) => {
    ({ message, data } = dataIn);
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
        ({ time_stamp, outside, pipe, shed, sample_count } = data)
        $('#titleSample').text(`Total Samples: ${sample_count.sample_count}`);
        // Data comes in as: {[outside], [pipe], [shed], [{time_stamp:date, time}]},
        // so will need to massage time_stamp before stuffing it into the graph.
        // Plan: Date tick only when day changes and is a different color.
        const xAxis = buildTimeAxis(time_stamp);

        chrt.data.datasets[0].data = outside;
        chrt.data.datasets[1].data = pipe;
        chrt.data.datasets[2].data = shed;
        chrt.data.labels = xAxis;
        chrt.update();
    } else if (message === 'min_max_temps_ready') {
        ({min, max} = data)
        $('#loDate').text(min.date_stamp);
        $('#loTime').text(min.time_stamp);
        $('#hiDate').text(max.date_stamp);
        $('#hiTime').text(max.time_stamp);
        $('#outsideLo').text(min.outside_temp);
        $('#outsideHi').text(max.outside_temp);
        $('#pipeLo').text(min.pipe_temp);
        $('#pipeHi').text(max.pipe_temp);
        $('#shedLo').text(min.shed_temp);
        $('#shedHi').text(max.shed_temp);


        $('#imSayin').text('Hello, America!!!')

        // POP DIALOG HERE AFTER ELEMENTS POPULATED WITH INCOMING DATA //
        let myModal = new bootstrap.Modal(document.getElementById("exampleModal"), {});
        myModal.show();
    
    } else if (message === 'send_id') {
        socket.emit('index_sends_message', {'message': 'my_id', 'data': myDeviceName});
    }
});

$('#showButton').on('click', () => {
    socket.emit('index_sends_message', {'message': 'get_min_max', 'data': 'NO DATA'});
})

const buildTimeAxis = (timeAxisIn) => {
    let timeArray = [];
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
    
    return timeArray;
};