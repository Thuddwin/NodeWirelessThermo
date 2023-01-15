const myDeviceName = 'index';
const socket = io();

const SAMPLE_INDICATOR ='#samplingIndicator';
const UPDATE_INDICATOR = '#updatingIndicator';
const ERROR_MODAL = '#errorModal';
const PRIMARY_SENSOR = 'Outside'
const cardMap = { 'cardOne': 0, 'cardTwo': 1, 'cardThree': 2, };


socket.on('connect', () => {
    console.log('CONNEDCTED!');
});

socket.on('server_sends_message', (dataIn) => {
    ({ message, data } = dataIn);
    // Current temps only. //
    if(message === 'temp_update') {
        flashIndicator(UPDATE_INDICATOR);
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
        flashIndicator(UPDATE_INDICATOR)
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


        $('#minMaxModalLabel').text(`Highest/Lowest Temps Based On ${PRIMARY_SENSOR} Sensor.`)

        // POP DIALOG HERE AFTER ELEMENTS POPULATED WITH INCOMING DATA //
        // TODO: ISSUE: This is causing all browsers to pop this modal.
        let minMaxModal = new bootstrap.Modal(document.getElementById("minMaxModal"), {});
        minMaxModal.show();
    
    } else if (message === 'send_id') {
        socket.emit('index_sends_message', {'message': 'my_id', 'data': myDeviceName});
    } else if (message === 'sampling_start') {
        flashIndicator(SAMPLE_INDICATOR);
    } else if (message === 'sensor_malfunction') {
        // POP DIALOG HERE AFTER ELEMENTS POPULATED WITH INCOMING DATA //
        $('#errorMessage').text(`"${data}" sensor is malfunctioning.`);
        let errorModal = new bootstrap.Modal(document.getElementById("errorModal"), {});
        errorModal.show();
    }
});

$('#showButton').on('click', () => {
    socket.emit('index_sends_message', {'message': 'get_min_max', 'data': 'NO DATA'});
});

$('.cardFillToggle').on('click', (cardIn) => {
    const idIn = cardIn.target.id;
    let oneFillEnb = chrt.data.datasets[cardMap[idIn]].fill;
    chrt.data.datasets[cardMap[idIn]].fill = !oneFillEnb;
    chrt.update();
});

const flashIndicator = (elementIdStringIn) => {
    $(elementIdStringIn).fadeIn(500);
    $(elementIdStringIn).fadeOut(1500);
}

let lastDate = '';
const buildTimeAxis = (timeAxisIn) => {
    let timeArray = [];
    timeAxisIn.forEach(tObj => {
        if (lastDate !== tObj.date) {
            console.log(`${myDeviceName}: buildTimeAxis():`);
            console.log(`BEFORE: lastDate: ${lastDate}, nowDate: ${tObj.date}, nowTime: ${tObj.time}`);
            lastDate = tObj.date;
            timeArray.push([tObj.date,tObj.time]);
            console.log(`AFTER: lastDate: ${lastDate}, nowDate: ${tObj.date}, nowTime: ${tObj.time}`);
            
        } else {
            // else push TIME only
            console.log(`${myDeviceName}: buildTimeAxis(): saving Time Only: ${tObj.time}`);
            timeArray.push(tObj.time);
        }
    });
    
    return timeArray;
};