
    // const ctx = document.getElementById('myChart');
    const outsideColor = {'r':13, 'g':202, 'b':230, 'a':1}; //'rgba(13, 202, 230, 1)'; // '#0dcaf0';
    // const pipeColor = '#f8f9fa';
    const pipeColor = {'r':235, 'g':52, 'b':113, 'a':1}; //'rgba(235, 52, 113,1)'; //'#eb3471';
    const shedColor = {'r':235, 'g':193, 'b':7,'a':1}; //'rgba(255, 193, 7, 1)'; //'#ffc107';

    const canvas = document.getElementById('canvas');
    const chartContext = canvas.getContext('2d');

    const setGradient = (rgbaColorIn) => {
        ({r, g, b, a} = rgbaColorIn)
        let gradient = chartContext.createLinearGradient(0, 0, 0, 800);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
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
                label: 'Outside',
                data: [],
                borderWidth: 2,
                backgroundColor: outsideGradient,
                borderColor: outsideGradient,
                tension: 0.4,
                fill: true

            },
            {
                label: 'Pipe',
                data: [],
                borderWidth: 2,
                backgroundColor: pipeGradient,
                borderColor: pipeGradient,
                tension: 0.4,
                fill: true
            },
            {
                label: 'Shed',
                data: [],
                borderWidth: 2,
                backgroundColor: shedGradient,
                borderColor: shedGradient,
                tension: 0.4,
                fill: true
            },
        ]
        },
        options: {
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
    