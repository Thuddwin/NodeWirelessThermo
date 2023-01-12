
    const ctx = document.getElementById('myChart');
    
    const chrt = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
        {
            label: 'Outside',
            data: [],
            borderWidth: 2,
            backgroundColor: '#0dcaf0',
            borderColor: '#0dcaf0',
            tension: 0.4
        },
        {
            label: 'Pipe',
            data: [],
            borderWidth: 2,
            backgroundColor: '#f8f9fa',
            borderColor: '#f8f9fa',
            tension: 0.4
        },
        {
            label: 'Shed',
            data: [],
            borderWidth: 2,
            backgroundColor: '#ffc107',
            borderColor: '#ffc107',
            tension: 0.4
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
    });

    console.log(chrt)
    