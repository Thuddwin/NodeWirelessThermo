const myDeviceName = 'index';
const socket = io();

const SAMPLE_INDICATOR ='#samplingIndicator';
const UPDATE_INDICATOR = '#updatingIndicator';
const ERROR_MODAL = '#errorModal';

// When changing label names, change these only. //
const SENSOR_1 = 'By Door';
const SENSOR_2 = 'Outside';
const SENSOR_3 = 'Inside';
///////////////////////////////////////////////////

const PRIMARY_SENSOR = SENSOR_2

const CARD_ONE_TITLE = `${SENSOR_1.toUpperCase()} TEMP (F)`;
const CARD_TWO_TITLE = `${SENSOR_2.toUpperCase()} TEMP (F)`;
const CARD_THREE_TITLE = `${SENSOR_3.toUpperCase()} TEMP (F)`;
const cardMap = { 'cardOne': 0, 'cardTwo': 1, 'cardThree': 2, };

let isMinMaxForMe = false;

// Graph Zoom, Scroll Globals //
const MAX_DATA_POINTS = 100;
let zoomFactor = 0; // NOTE: zoomFactor will changed when Zoom In/Out buttons are clicked.
let dataPoints = MAX_DATA_POINTS - zoomFactor;

// Assign button events for Chart Scroll, Reset, Zoom.
$('.chartDataViews').on('click', (eventIn) => {
    const btnId = eventIn.target.id;
    socket.emit('index_sends_message', {'message': `${btnId}`, 'data': 'NO DATA'});
});

// Fill In Titles, Labels, etc... //
$('#cardOne').text(CARD_ONE_TITLE);
$('#cardTwo').text(CARD_TWO_TITLE);
$('#cardThree').text(CARD_THREE_TITLE);
$("#minMaxModalColOne").text(SENSOR_1);
$("#minMaxModalColTwo").text(SENSOR_2);
$("#minMaxModalColThree").text(SENSOR_3);
    // NOTE: Chart datasets is an array of objects.
    //      First object is relative to cardOne, 
    //      second to cardTwo, etc.
    chrt.data.datasets[0].label = SENSOR_1;
    chrt.data.datasets[1].label = SENSOR_2;
    chrt.data.datasets[2].label = SENSOR_3;
$('#minMaxModalLabel').text(`Highest/Lowest Temps Based On ${PRIMARY_SENSOR} Sensor.`)

socket.on('connect', () => {
    console.log('CONNECTED!');
});

socket.on('server_sends_message', (dataIn) => {
    ({ message, data } = dataIn);
    if(message === 'temp_update') {
        /* Card and Timestamp single data points only coming directly from 
        the Sensor Module after crossing 5 degree threshold.
        Does NOT update the Graph. Is NOT array data. */
        
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
        flashIndicator(UPDATE_INDICATOR);
        ({ time_stamp, outside, pipe, shed, sample_count } = data)
        $('#titleSample').text(`Total Samples: ${sample_count}`);

        chrt.data.datasets[0].data = outside;
        chrt.data.datasets[1].data = pipe;
        chrt.data.datasets[2].data = shed;
        chrt.data.labels = time_stamp;
        chrt.update();
        //////////////////////////////////////////////////////////////////////

    } else if (message === 'min_max_temps_ready') {
        if (!isMinMaxForMe) { return; }
        isMinMaxForMe = false;
        ({min, max} = data)
        $('#loDate').text(`${min.date_stamp} ${min.time_stamp}`);
        $('#hiDate').text(`${max.date_stamp} ${max.time_stamp}`);
        $('#outsideLo').text(min.outside_temp);
        $('#outsideHi').text(max.outside_temp);
        $('#pipeLo').text(min.pipe_temp);
        $('#pipeHi').text(max.pipe_temp);
        $('#shedLo').text(min.shed_temp);
        $('#shedHi').text(max.shed_temp);

        // POP DIALOG HERE AFTER ELEMENTS POPULATED WITH INCOMING DATA //
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
    } else if (message === 'indicator_data_ready') {
        ({totalRecords, startIndex, dataWidth, buttonStates} = data)
        const progOuterWidth = $('#progOuter').width();
        const progBarPosition = $('#progBar').position();
        const dataPoint = progOuterWidth / totalRecords;
        
        const progBarWidth = Math.round(dataPoint * dataWidth);
        $('#progBar').width(progBarWidth);
        
        const progBarOffset = Math.round(startIndex * dataPoint);
        $('#progBar').offset({left: progBarOffset, top: progBarPosition.top});
        
        const progInfo = {
            totalRecords: totalRecords,
            progBarWidth: progBarWidth,
            progBarOffset: progBarOffset,
            progOuterWidth: progOuterWidth
        };
        $('#infoDataPoints').text(`Data Points: ${dataWidth}`);
    } else if (message === 'button_states_ready') {
        ({DenbScrollLeft, DenbScrollRight, DenbZoomIn, DenbZoomOut} = data)
        $('#scrollLeft').prop('disabled', DenbScrollLeft);
        $('#scrollRight').prop('disabled', DenbScrollRight);
        $('#zoomIn').prop('disabled', DenbZoomIn);
        $('#zoomOut').prop('disabled', DenbZoomOut);
    } else if (message === 'error_list_ready') {
        console.log(`${myDeviceName}:on.server_sends_message:error_list_ready:data:`);
        console.log(data);
        showErrors(data);
    }
});

$('#minMaxButton').on('click', () => {
    isMinMaxForMe = true;
    socket.emit('index_sends_message', {'message': 'get_min_max', 'data': 'NO DATA'});
});

$('#showErrorsButton').on('click', () => {
    socket.emit('index_sends_message', {'message': 'request_error_list', 'data': 'NO DATA'});
})

$('.graphFillToggle').on('click', (cardIn) => {
    const idIn = cardIn.target.id;
    let oneFillEnb = chrt.data.datasets[cardMap[idIn]].fill;
    chrt.data.datasets[cardMap[idIn]].fill = !oneFillEnb;
    chrt.update();
});

const showErrors = (dataIn) => {
    console.log(`${myDeviceName}: showErrors(): dataIn:`);
    console.log(dataIn);
    $('#errorListContainer').empty();
    let titleRow =
        `<div class="row border"> \
            <div class="col-3 border j">Date</div> \
            <div class="col-1 border j">Id</div> \
            <div class="col-2 border j">Error</div> \
            <div class="col-2 border j">Outside</div> \
            <div class="col-2 border j">Pipe</div> \
            <div class="col-2 border j">Shed</div> \
        </div>`;
    $('#errorListContainer').append(titleRow);
    dataIn.forEach((elem) => {
        console.log('elem:');
        console.log(elem);
        const rowString = 
            `<div class="row"> \
                <div class="col-3 border j">${elem.time_stamp}</div> \
                <div class="col-1 border j">${elem.id}</div> \
                <div class="col-2 border j">${elem.error_type}</div> \
                <div class="col-2 border j">${elem.outside_temp}</div> \
                <div class="col-2 border j">${elem.pipe_temp}</div> \
                <div class="col-2 border j">${elem.shed_temp}</div> \
            </div>`;
        $('#errorListContainer').append(rowString);
    });

    let errorListModal = new bootstrap.Modal(document.getElementById("errorListModal"), {});
        errorListModal.show();

}

const flashIndicator = (elementIdStringIn) => {
    $(elementIdStringIn).fadeIn(500);
    $(elementIdStringIn).fadeOut(1500);
}
