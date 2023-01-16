    const FILL_ENABLED = true;
    
    let isFillOneEnb = true;

    const outsideColor = { 'r':13, 'g':202, 'b':230, 'a':0.5 };   // '#0dcaf0';
    const pipeColor = { 'r':255, 'g':0, 'b':0, 'a':1 };        // '#ff0000';
    const shedColor = { 'r':255, 'g':255, 'b':255, 'a':0.5 };         // '#ffffff';

    const canvas = document.getElementById('canvas');
    const chartContext = canvas.getContext('2d');

    const setGradient = (rgbaColorIn) => {
        ({r, g, b, a} = rgbaColorIn)
        let gradient = chartContext.createLinearGradient(0, 0, 0, 800);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
        gradient.addColorStop(1, `rgba(100, 100, 0, 0)`); // `rgba(${r}, ${g}, ${b}, 0)`

        return gradient;
    };

    const outsideGradient = setGradient(outsideColor);
    const pipeGradient = setGradient(pipeColor);
    const shedGradient = setGradient(shedColor);

    const chartOptions = {
        type: 'line',
        data: {
            labels: [],
            datasets: [
            {
                label: '', //Filled In at start of index.js
                data: [],
                borderWidth: 2,
                backgroundColor: outsideGradient,
                borderColor: outsideGradient,
                tension: 0.4,
                fill: isFillOneEnb
            },
            {
                label: '', //Filled In at start of index.js
                data: [],
                borderWidth: 2,
                backgroundColor: pipeGradient,
                borderColor: pipeGradient,
                tension: 0.4,
                fill: FILL_ENABLED
            },
            {
                label: '', //Filled In at start of index.js
                data: [],
                borderWidth: 2,
                backgroundColor: shedGradient,
                borderColor: shedGradient,
                tension: 0.4,
                fill: FILL_ENABLED
            },
        ]
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        color: 'white',
                    }
                }
            },
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                x: {
                    border: {
                        display: true
                    },
                    grid: {
                        color: 'gray'
                    },
                    ticks: {
                        color: 'white',
                        fontSize: 16
                    }
                },
                y: {
                    beginAtZero: false,
                    stacked: false,
                    border: {
                        display: true
                    },
                    grid: {
                        color: 'gray'
                    },
                    ticks: {
                        color: 'white',
                        fontSize: 16
                    }
                }
            }
        },
    };

    const chrt = new Chart(chartContext, chartOptions);

    console.log(chrt)
