var x = {
  chart: {
    type: 'line'
  },
  title: {
    text: 'Total Cases'
  },
  subtitle: {
    text: '(Linear Scale)'
  },
  xAxis: {
    categories: ["Jan 22", "Jan 23", "Jan 24", "Jan 25", "Jan 26", "Jan 27", "Jan 28", "Jan 29", "Jan 30", "Jan 31", "Feb 01", "Feb 02", "Feb 03", "Feb 04", "Feb 05", "Feb 06", "Feb 07", "Feb 08", "Feb 09", "Feb 10", "Feb 11", "Feb 12", "Feb 13", "Feb 14", "Feb 15", "Feb 16", "Feb 17", "Feb 18", "Feb 19", "Feb 20", "Feb 21", "Feb 22", "Feb 23", "Feb 24", "Feb 25", "Feb 26", "Feb 27", "Feb 28", "Feb 29", "Mar 01", "Mar 02", "Mar 03", "Mar 04", "Mar 05", "Mar 06", "Mar 07", "Mar 08", "Mar 09", "Mar 10", "Mar 11", "Mar 12", "Mar 13", "Mar 14", "Mar 15", "Mar 16", "Mar 17", "Mar 18", "Mar 19", "Mar 20", "Mar 21", "Mar 22", "Mar 23", "Mar 24", "Mar 25", "Mar 26", "Mar 27"]
  },
  yAxis: {
    title: {
      text: 'Total Coronavirus Cases'
    }
  },
  legend: {
    layout: 'vertical',
    align: 'right',
    verticalAlign: 'middle'
  },
  credits: {
    enabled: false
  },
  series: [{
    name: 'Cases',
    color: '#33CCFF',
    lineWidth: 5,
    data: [580, 845, 1317, 2015, 2800, 4581, 6058, 7813, 9823, 11950, 14553, 17391, 20630, 24545, 28266, 31439, 34876, 37552, 40553, 43099, 45134, 59287, 64438, 67100, 69197, 71329, 73332, 75184, 75700, 76677, 77673, 78651, 79205, 80087, 80828, 81820, 83112, 84615, 86604, 88585, 90443, 93016, 95314, 98425, 102050, 106099, 109991, 114381, 118948, 126214, 134509, 145416, 156475, 169517, 182414, 198159, 218744, 244902, 275550, 304979, 337459, 378830, 422574, 471035, 531865, 596366]
  }],
  responsive: {
    rules: [{
      condition: {
        maxWidth: 800
      },
      chartOptions: {
        legend: {
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom'
        }
      }
    }]
  }
}