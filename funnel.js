var gd = document.getElementById('funnel');
var data = [{type: 'funnel', name: 'BMI >40',
  y: ["Total Market"],
  x: [120],
  textinfo: "value"},
  {
     type: 'funnel',name: 'Self-Referral',
    y: ["Actively Searching", "Referral", "Consult", "Surgery"],
    x: [40, 20, 10, 5], textposition: "inside", textinfo: "value"},
  {
    type: 'funnel',name: 'Physician Referral',
    y: ["Referral", "Consult", "Surgery"],
    x: [10, 5, 3], textposition: "hidden", textinfo: "value"}];


var layout = {margin: {l: 130, r: 0}, width: 600, funnelmode: "stack", showlegend: true}

Plotly.newPlot('funnel', data, layout);