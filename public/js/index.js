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
    console.log(`${btnId} was clicked! socket.emit...`);
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
        $('#titleSample').text(`Total Samples: ${sample_count}`);
        // Data comes in as: {[outside], [pipe], [shed], [{time_stamp:date, time}]},
        // so will need to massage time_stamp before stuffing it into the graph.
        // Plan: Date tick only when day changes and is a different color.
        const xAxis = buildTimeAxis(time_stamp);

        chrt.data.datasets[0].data = outside;
        chrt.data.datasets[1].data = pipe;
        chrt.data.datasets[2].data = shed;
        chrt.data.labels = xAxis;
        chrt.update();
        //////////////////////////////////////////////////////////////////////
        
        // TODO: below...
        // updateChartButtonsState({'dataPoints': chrt.data.datasets});

    } else if (message === 'min_max_temps_ready') {
        if (!isMinMaxForMe) { return; }
        isMinMaxForMe = false;
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
        ({totalRecords, startIndex, dataWidth} = data)
        console.log(`${myDeviceName}:on.indicator_data_ready...`)
        console.log(`${myDeviceName}: on.indicator_data_ready: data:`)
        console.log(`totalRecords: ${totalRecords}, startIndex: ${startIndex}, dataWidth: ${dataWidth}`);
        const progOuterWidth = $('#progOuter').width();
        const progBarPosition = $('#progBar').position();
        const dataPoint = progOuterWidth / totalRecords; console.log(`Calculated dataPoint = ${dataPoint}.`);
        
        const progBarWidth = dataPoint * dataWidth;
        $('#progBar').width(progBarWidth);
        
        const progBarOffset = startIndex * dataPoint;
        $('#progBar').offset({left: progBarOffset, top: progBarPosition.top});
        
        const progInfo = {
            totalRecords: totalRecords,
            progBarWidth: progBarWidth,
            progBarOffset: progBarOffset,
            progOuterWidth: progOuterWidth
        };
        updateChartButtonsState(progInfo);
    }
});

$('#minMaxButton').on('click', () => {
    isMinMaxForMe = true;
    socket.emit('index_sends_message', {'message': 'get_min_max', 'data': 'NO DATA'});
});

$('.graphFillToggle').on('click', (cardIn) => {
    const idIn = cardIn.target.id;
    let oneFillEnb = chrt.data.datasets[cardMap[idIn]].fill;
    chrt.data.datasets[cardMap[idIn]].fill = !oneFillEnb;
    chrt.update();
});

const updateChartButtonsState = (dataIn) => {
    ({totalRecords, progBarWidth, progBarOffset, progOuterWidth} = dataIn)
    console.log(`${myDeviceName}: updateChartButtonsState(): dataIn`);
    console.log(dataIn);
    const isDEnbScrollLeft = (progBarOffset < progBarWidth) ? true : false;
    const isDEnbScrollRight = (Math.abs(progOuterWidth - (progBarOffset + progBarWidth)) < progBarWidth) ? true : false;
    const isDEnbZoomIn = (progBarWidth <= 10) ? true : false;
    const isDEnbZoomOut = ((progBarWidth >= 200) || (progBarWidth >= totalRecords)) ? true : false;
    $('#scrollLeft').prop('disabled', isDEnbScrollLeft);
    $('#scrollRight').prop('disabled', isDEnbScrollRight);
    $('#zoomIn').prop('disabled', isDEnbZoomIn);
    $('#zoomOut').prop('disabled', isDEnbZoomOut);
};

const flashIndicator = (elementIdStringIn) => {
    $(elementIdStringIn).fadeIn(500);
    $(elementIdStringIn).fadeOut(1500);
}

let lastDate = '';
const buildTimeAxis = (timeAxisIn) => {
    let timeArray = [];
    let index = 0;
    timeAxisIn.forEach(tObj => {
        if ((lastDate !== tObj.date) || !index) {
            lastDate = tObj.date;
            timeArray.push([tObj.date,tObj.time]);
            
        } else {
            // else push TIME only
            timeArray.push(tObj.time);
        }
        index++;
    });
    
    return timeArray;
};