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

info.update = function (props) {
  this._div.innerHTML =
    "<h4>Population</h4>" +
    (props
      ? "<b>" +
        props.NAME +
        " County</b><br />" +
        "County Number " + 
        props.COUNTY
      : "Hover over a county");
};

info.addTo(map);

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

async function highlightFeature(e) {
  var layer = e.target;

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

  info.update(layer.feature.properties);
}

function highlightFeatureMouseover(e) {
  var layer = e.target;

  info.update(layer.feature.properties);
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
  console.log(map.getZoom());
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



// let countyList = document.getElementById('CountyList')
let countyTable = document.getElementById("CountyTable");
let created = false;
let rows = [];

const updateList = () => {

  let bmi40 = malePop * .069 + femalePop * .115;
  let bmi30 = malePop * .17 + femalePop * .217;
  let consults = bmi30 * .022;
  let referrals = consults / .74;

  let columnValues = [
    ["Male Population", malePop],
    ["Female Population", femalePop],
    ["BMI > 35 Male", malePop * .17],
    ["BMI > 35 Female", femalePop * .217],
    ["Total Market BMI > 35", bmi30],
    ["Actively Searching Rate", (malePop + femalePop) * .009],
    ["Estimated Self Referrals", referrals * .7],
    ["Estimated Clinal Referrals", referrals * .3],
    ["Estimated Total Referrals", referrals],
    ["Estimated Consults", consults],
    ["Estimated Surgeries", consults * .5],
    ["BMI > 40 Male", malePop * .069],
    ["BMI > 40 Female", femalePop * .115],
    ["Total Market BMI > 40", bmi40],
    ["Consults", bmi40 * .022],
    ["Surgeries", bmi40 * .011]
  ];

  if (created == false) {
  for (let i = 0; i < 13; i++) {
    rows[i] = document.createElement('tr');
    rows[i].appendChild(document.createElement('td'));
    rows[i].appendChild(document.createElement('td'));
    countyTable.appendChild(rows[i]);
  }
}
  for (let i in countyTable.rows) {
    countyTable.rows[i].cells[0].innerText = columnValues[i][0];
    countyTable.rows[i].cells[1].innerText = Math.round(columnValues[i][1]);
  }

  created = true;

  // while (countyList.firstChild) {countyList.removeChild(countyList.firstChild);}
  // selectedMap.forEach(async (population, county) => {
  //   let li = document.createElement('li');
  //   li.innerText = county.properties.NAME + " County "+ population["population"][0] + " " + population["population"][1];
  //   countyList.appendChild(li);
  // });
  // let mP = document.createElement('li');
  // let fP = document.createElement('li');

  // mP.innerText = "Male Pop: " + malePop;
  // fP.innerText = "Female Pop: " + femalePop;

  // countyList.appendChild(mP);
  // countyList.appendChild(fP);
  }

