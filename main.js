var map = L.map("map", {}).setView([37.8, -96], 4);

var token =
  "pk.eyJ1IjoiYWJpdGFtaW0iLCJhIjoiY2tyODliMnZiM3gwODJwbWZ4MGk0c2hzOCJ9.Ai8tTLlhekY0JQvZatL-VA";

L.tileLayer(
  "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=" +
    token,
  {
    maxZoom: 18,
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: "mapbox/light-v9",
    tileSize: 512,
    zoomOffset: -1,
  }
).addTo(map);

// control that shows state info on hover
var info = L.control();

info.onAdd = function (map) {
  this._div = L.DomUtil.create("div", "info");
  this.update();
  return this._div;
};

info.update = function (props, type) {
  this._div.innerHTML = 
    (props
      ? "<b>" +
        props.NAME +
        (type === "county" ? " County" : "") +"</b><br />"
      : "Hover over a county or state");
};

info.addTo(map);

const dropdown = document.getElementById("states");
for (let [state, price] of Object.entries(prices)) {
  let option = document.createElement("option");
  if (state == '') {
    option.selected = true;
  }
  option.text = state;
  dropdown.appendChild(option);
}

// get color depending on population density value
function getColor(d) {
  return d > 1000
    ? "#800026"
    : d > 500
    ? "#BD0026"
    : d > 200
    ? "#E31A1C"
    : d > 100
    ? "#FC4E2A"
    : d > 50
    ? "#FD8D3C"
    : d > 20
    ? "#FEB24C"
    : d > 10
    ? "#FED976"
    : "#FFEDA0";
}

function style(feature) {
  return {
    weight: 2,
    opacity: 1,
    color: "white",
    dashArray: "3",
    fillOpacity: 0.3,
    fillColor: getColor(feature.properties.density),
  };
}

function styleState(feature) {
  return {
    weight: 5,
    opacity: 1,
    color: "white",
    dashArray: "3",
    fillOpacity: 0.3,
    fillColor: getColor(feature.properties.density),
  };
}


function highlightFeatureOnClick(e) {
  var layer = e.target;



  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }

  info.update(layer.feature.properties);
}

const selectedMap = new Map();

let malePop = 0;
let femalePop = 0;

let roiState = document.getElementById("states");

async function highlightFeature(e) {
  var layer = e.target;

  roiState.selected = "John";

  if (selectedMap.has(layer.feature)) {
      resetHighlight(e);
      let county = selectedMap.get(layer.feature);
      malePop -= county["population"][0];
      femalePop -= county["population"][1];
      selectedMap.delete(layer.feature);
  }
  else {
      layer.setStyle({
      weight: 4,
      color: "#666",
      dashArray: "",
      fillOpacity: 0.7,
      });

      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
      }
      let countyPop = await findPopulation(layer.feature.properties.COUNTY, layer.feature.properties.STATE);
      malePop += countyPop[0];
      femalePop += countyPop[1];
      selectedMap.set(layer.feature, {population: await countyPop});
      info.update(layer.feature.properties);
  }
  updateList();
}


function highlightFeatureState(e) {
  var layer = e.target;


  layer.setStyle({
  weight: 4,
  color: "#666",
  dashArray: "",
  fillOpacity: 0.7,
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
  layer.bringToFront();
  }

  info.update(layer.feature.properties, "state");
}

function highlightFeatureMouseover(e) {
  var layer = e.target;

  info.update(layer.feature.properties, "county");
}

var geojson, geojson_states, geojson_states_noclick;

function resetHighlightState(e) {
  geojson_states.resetStyle(e.target);
  info.update();
}

function resetHighlight(e) {
  geojson.resetStyle(e.target);
  info.update();
}

function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeatureState,
    mouseout: resetHighlightState,
    click: zoomToFeature,
  });
}

function onEachFeatureCounty(feature, layer) {
  layer.on({
    click: highlightFeature,
    mouseover: highlightFeatureMouseover
  //   click: zoomToFeature,
  });
}

geojson = L.geoJson(countyData, {
  style: style,
  onEachFeature: onEachFeatureCounty,
});

geojson_states = L.geoJson(statesData, {
  style: styleState,
  onEachFeature: onEachFeature,
}).addTo(map);

geojson_states_noclick = L.geoJson(statesData, {
  style: styleState,
  // onEachFeature: onEachFeature
});

map.on("zoomend", function () {
  if (map.getZoom() < 6) {
    map.removeLayer(geojson);
    map.addLayer(geojson_states);
    geojson_states.resetStyle();
    map.removeLayer(geojson_states_noclick);
  } else {
    map.removeLayer(geojson_states); //2nd geoJSON layer
    map.addLayer(geojson_states_noclick);
    map.addLayer(geojson);
  }
});

map.attributionControl.addAttribution(
  'Population data &copy; <a href="http://census.gov/">US Census Bureau</a>'
);

const apiKey = "d430848ddb762341ad5ac1505927083e4747482c";

let findPopulation = (countyCode, stateCode) => {
  /* Query the census api and find the population of males and women in the
county.
  */
  const male = "B01001_002E,B01001_003E,B01001_004E,B01001_005E,B01001_006E"
  const female = "B01001_026E,B01001_027E,B01001_028E,B01001_029E,B01001_030E"
  let request = new Request("https://api.census.gov/data/2019/acs/acs5?get=NAME," + male + "," + female + "&for=county:" + countyCode + "&in=state:" + stateCode + "&key=" + apiKey);
  return fetch(request)
        .then(body => body.text())
        .then(text => {
          let pop = JSON.parse(text)[1];
          pop = pop.map((element) => {return parseInt(element);});
          return [pop[1] - pop[2] - pop[3] - pop[4] - pop[5], pop[6] - pop[7] - pop[8] - pop[9] - pop[10]];});
}

const sumGender = (population) => {
  let malePop = 0;
  let femalePop = 0;
  population.forEach((element) => {
    malePop += element[0];
    femalePop += element[1];
  });
  return [malePop, femalePop];
}

const updateView = (populations) => {
  let li = document.createElement('li');
  let li2 = document.createElement('li');
  let population = sumGender(populations);
  li.innerText = "Male Pop: " + population[0];
  li2.innerText = "Female Pop: " + population[1];
  countyList.appendChild(li);
  countyList.appendChild(li2);
} 

let countyTable = document.getElementById("CountyTable");
let gd = document.getElementById('funnel');

let created = false;
let rows = [];

const updateList = () => {

  let bmi40 = malePop * .069 + femalePop * .115;
  let bmi35 = malePop * .17 + femalePop * .217;
  let consults = bmi35 * .022;
  let referrals = consults / .74;
  let activelySearching = (malePop + femalePop) * .009;

  let columnValues = [
    ["Male Population", malePop],
    ["Female Population", femalePop],
    ["BMI > 35 Male", Math.round(malePop * .17)],
    ["BMI > 35 Female", Math.round(femalePop * .217)],
    ["Total Market BMI > 35", Math.round(bmi35)],
    ["Actively Searching Rate", Math.round(activelySearching)],
    ["Estimated Self Referrals", Math.round(referrals * .7)],
    ["Estimated Clinical Referrals", Math.round(referrals * .3)],
    ["Estimated Total Referrals", Math.round(referrals)],
    ["Estimated Consults", Math.round(consults)],
    ["Estimated Surgeries", Math.round(consults * .5)],
    ["BMI > 40 Male", Math.round(malePop * .069)],
    ["BMI > 40 Female", Math.round(femalePop * .115)],
    ["Total Market BMI > 40", Math.round(bmi40)],
    ["Estimated Consults BMI > 40", Math.round(bmi40 * .022)],
    ["Estimated Surgeries BMI > 40", Math.round(bmi40 * .011)]
  ];

  if (created == false) {
  for (let i = 0; i < 16; i++) {
    rows[i] = document.createElement('tr');
    rows[i].appendChild(document.createElement('td'));
    rows[i].appendChild(document.createElement('td'));
    countyTable.appendChild(rows[i]);
  }
  created = true;
}


const numberWithCommas = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
  console.log(countyTable.rows);
  for (let i = 0; i < 16; i++) {
    console.log("before " + i);
    let value = columnValues[i][0];
    console.log("after " + i);
    countyTable.rows[i].cells[0].innerText = value;
    countyTable.rows[i].cells[1].innerText = numberWithCommas(columnValues[i][1]);
  }

  let layout = {margin: {l: 130, r: 0}, autosize: true, funnelmode: "stack", showlegend: true}

  let config = {responsive: true};

  let data = [{ type: 'funnel', name: 'BMI > 35 (x10)',
                y: ["Total Market"],
                x: [columnValues[4][1] / 10],
                textinfo: "value"},
  {
    type: 'funnel',name: 'Self-Referral',
    y: ["Actively Searching", "Referral", "Consult", "Surgery"],
    x: [numberWithCommas(columnValues[5][1]), columnValues[6][1], Math.round(columnValues[6][1] * .8), Math.round(columnValues[6][1] * .8 * .5)], textinfo: "value"},
  {
    type: 'funnel',name: 'Physician Referral',
    y: ["Referral", "Consult", "Surgery"],
    x: [columnValues[7][1], Math.round(columnValues[7][1] * .348), Math.round(columnValues[7][1] * .348 * .5)]}];

  Plotly.newPlot('funnel', data, layout, config);

  }

  function autocomplete(inp, arr) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function(e) {
        var a, b, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) { return false;}
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i = 0; i < arr.length; i++) {
          /*check if the item starts with the same letters as the text field value:*/
          if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
            /*create a DIV element for each matching element:*/
            b = document.createElement("DIV");
            /*make the matching letters bold:*/
            b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
            b.innerHTML += arr[i].substr(val.length);
            /*insert a input field that will hold the current array item's value:*/
            b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
            /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function(e) {
                /*insert the value for the autocomplete text field:*/
                inp.value = this.getElementsByTagName("input")[0].value;
                /*close the list of autocompleted values,
                (or any other open lists of autocompleted values:*/
                closeAllLists();
            });
            a.appendChild(b);
          }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function(e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
          /*If the arrow DOWN key is pressed,
          increase the currentFocus variable:*/
          currentFocus++;
          /*and and make the current item more visible:*/
          addActive(x);
        } else if (e.keyCode == 38) { //up
          /*If the arrow UP key is pressed,
          decrease the currentFocus variable:*/
          currentFocus--;
          /*and and make the current item more visible:*/
          addActive(x);
        } else if (e.keyCode == 13) {
          /*If the ENTER key is pressed, prevent the form from being submitted,*/
          e.preventDefault();
          if (currentFocus > -1) {
            /*and simulate a click on the "active" item:*/
            if (x) x[currentFocus].click();
          }
        }
    });
    function addActive(x) {
      /*a function to classify an item as "active":*/
      if (!x) return false;
      /*start by removing the "active" class on all items:*/
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = (x.length - 1);
      /*add class "autocomplete-active":*/
      x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
      /*a function to remove the "active" class from all autocomplete items:*/
      for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
      }
    }
    function closeAllLists(elmnt) {
      /*close all autocomplete lists in the document,
      except the one passed as an argument:*/
      var x = document.getElementsByClassName("autocomplete-items");
      for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
      closeAllLists(e.target);
  });
  }

  autocomplete(document.getElementById("hospitalInput"), hospitalNames);

  const hospitalForm = document.getElementById("HospitalForm");

  let defToken = null;

  const getToken = () => {
    const tokenRequest = new Request("https://api.defhc.com/v5/token", {
      method: "POST",
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({"grant_type": "password", "username": def_user, "password": def_pass})
    });

    return fetch(tokenRequest)
            .then(response => response.json())
            .then(json => json.access_token);
  }

  const getHospitalData = (hospitalId, token) => {
    console.log("sent request");
    const dataRequest = new Request("https://api.defhc.com/v5/odata-v4/Hospitals(${hospitalId})")
  }

  hospitalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Clicked");
    if (!defToken) {
      defToken = await getToken()
    }
    console.log(defToken);
    getHospitalData("0", defToken);
  });

  let totalSurgeries = document.getElementById("noSurgery");
  let bypass = document.getElementById("noBypass");
  let sleeve = document.getElementById("noSleeve");
  let totalConsults = document.getElementById("noConsult");
  let percentConsult = document.getElementById("perConsult");
  let margin = document.getElementById("marSurgery");
  let medicalIntake = document.getElementById("intake");
  let growth = document.getElementById("growth");


  const calcCost = (numSurgeries) => {
    numSurgeries = parseInt(numSurgeries);
    switch (true) {
      case (numSurgeries <= 150):
        return 56000;
      case (numSurgeries <= 350):
        return 75000;
      case (numSurgeries <= 650):
        return 113000;
      return 151000;
    }
  }
  const calcMarginGrowth = () => {
    const intake = parseFloat(medicalIntake.value);
    const surgery = parseFloat(totalSurgeries.value);
    const consult = parseFloat(totalConsults.value);
    const percent = parseFloat(percentConsult.value) * .01;
    const marginVal = parseFloat(margin.value);
    const growthVal = 1 + parseFloat(growth.value) * .01;

    let statusQuo = {
      "supervised": {
        "intake": [intake, intake * growthVal, intake * growthVal * growthVal]
      },
      "surgical": {},
    };

    //[w/o Wellbe, Year 1, Year 2, Year 3]
    //[intake to appointment %, consult to surgery %]
    let pullThroughRate = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0]
    ];

    statusQuo["supervised"]["goToSurgery"] = statusQuo["supervised"]["intake"].map(x => x * .125);
    statusQuo["surgical"]["consults"] = [consult, consult * growthVal, consult * growthVal * growthVal];
    const reqConsultInitial = ((consult*percent)/.569)+((consult*(1-percent))/.75);
    statusQuo["surgical"]["requestedConsults"] = [reqConsultInitial, reqConsultInitial * growthVal, reqConsultInitial * growthVal * growthVal];
    statusQuo["surgical"]["surgery"] = [
      surgery+statusQuo["supervised"]["goToSurgery"][0]*.5,
      0,
      0
    ];
    
    pullThroughRate[0][0] = statusQuo["surgical"]["consults"][0] / statusQuo["surgical"]["requestedConsults"][0];
    pullThroughRate[0][1] = statusQuo["surgical"]["surgery"][0] / statusQuo["surgical"]["consults"][0];
    pullThroughRate[1][0] = pullThroughRate[0][0] * wellbeImprovement[0][1];
    pullThroughRate[1][1] = pullThroughRate[0][1] * wellbeImprovement[0][2];
    pullThroughRate[2][0] = pullThroughRate[1][0] * wellbeImprovement[1][1];
    pullThroughRate[2][1] = pullThroughRate[1][1] * wellbeImprovement[1][2];
    pullThroughRate[3][0] = pullThroughRate[2][0] * wellbeImprovement[2][1];
    pullThroughRate[3][1] = pullThroughRate[2][1] * wellbeImprovement[2][2];

    statusQuo["surgical"]["surgery"][1] = statusQuo["surgical"]["consults"][1]*pullThroughRate[0][1]+statusQuo["supervised"]["goToSurgery"][0]*.5+statusQuo["supervised"]["goToSurgery"][1]*.5,
    statusQuo["surgical"]["surgery"][2] = statusQuo["surgical"]["consults"][2]*pullThroughRate[0][1]+statusQuo["supervised"]["goToSurgery"][1]*.5+statusQuo["supervised"]["goToSurgery"][2]*.5
    const wellbeMedConsultInitial = statusQuo["supervised"]["intake"][0]*wellbeImprovement[0][0];
    const wellbeReqConsultInitial = statusQuo["surgical"]["requestedConsults"][0]*wellbeImprovement[0][0];
    let afterWellbe = {
      "supervised": {
        "intake": [wellbeMedConsultInitial, wellbeMedConsultInitial*wellbeImprovement[1][0], wellbeMedConsultInitial*wellbeImprovement[1][0]*wellbeImprovement[2][0]]
      },
      "surgical": {
        "requestedConsults": [wellbeReqConsultInitial, wellbeReqConsultInitial*wellbeImprovement[1][0], wellbeReqConsultInitial*wellbeImprovement[1][0]*wellbeImprovement[2][0]]
      }
    };
    afterWellbe["supervised"]["goToSurgery"] = afterWellbe["supervised"]["intake"].map(x => x * .1875);

    afterWellbe["surgical"]["consults"] = [
      afterWellbe["surgical"]["requestedConsults"][0]*pullThroughRate[1][0], 
      afterWellbe["surgical"]["requestedConsults"][1]*pullThroughRate[2][0],
      afterWellbe["surgical"]["requestedConsults"][2]*pullThroughRate[3][0]
    ];
    
    afterWellbe["surgical"]["surgery"] = [
      afterWellbe["surgical"]["consults"][0]*pullThroughRate[1][1]+afterWellbe["supervised"]["goToSurgery"][0]*.5,
      afterWellbe["surgical"]["consults"][1]*pullThroughRate[2][1]+afterWellbe["supervised"]["goToSurgery"][0]*.5+afterWellbe["supervised"]["goToSurgery"][1]*.5,
      afterWellbe["surgical"]["consults"][2]*pullThroughRate[3][1]+afterWellbe["supervised"]["goToSurgery"][1]*.5+afterWellbe["supervised"]["goToSurgery"][2]*.5
    ];

    let netMargin = afterWellbe["surgical"]["surgery"].map(x => x*marginVal-calcCost(x));
    let preMargin = statusQuo["surgical"]["surgery"].map(x => x*marginVal);
    let netGain = [-23000, 0, 0]
    for (let i = 0; i < netMargin.length; i++) {
      netGain[i] += parseInt(netMargin[i] - preMargin[i]);
    }
    return netGain;
    let x = 1;
  }

  ROIForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Clicked");
    buildGraph(calcMarginGrowth());
    // if (!defToken) {
    //   defToken = await getToken()
    // }
    // console.log(defToken);
    // getHospitalData("0", defToken);
  });

  const buildGraph = (values) =>{

    let chart = new CanvasJS.Chart("netMargin", {
      animationEnabled: true,
      title:{
        text: "Net Margin Gain"
      },
      axisY:{
        title: "Net Margin Gain"
      },
      axisX:{
        minValue: 0,
        maxValue: 4,
        interval: 1,
        title: "Year",
        gridThickness: 1,
        tickLength: 1
       },
 
       data: [
       {
         type: "area",
         dataPoints: [
        { x: 0, y: 0},
         { x: 1, y: values[0] },
         { x: 2, y: values[1] },
         { x: 3, y: values[2] }
         ]
       }
       ]
     });
    chart.render();
    
    }