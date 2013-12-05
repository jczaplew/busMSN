var selectedStops = [],
    selectedMarkers = {};

var southWest = L.latLng(42.948381, -89.6044),
  northEast = L.latLng(43.1991, -89.17327),
  bounds = L.latLngBounds(southWest, northEast);

var map = new L.map("map", {
  center: new L.LatLng(43.071772, -89.398155),
  zoom:13,
  minZoom:12,
  maxZoom:18,
  zoomControl: false,
  maxBounds: bounds
});

var attrib = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';

var stamenLabels = new L.TileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', {attribution: attrib}).addTo(map);

var style = {
  radius:3,
  fillColor: "#719fbd",
  color: "#6597B8",
  weight: 2.5,
  opacity: 1,
  fillOpacity: 0.95
};

function parseStops(feature, layer) {
  layer.bindPopup(feature.properties.name);
}

d3.json("js/stops.geojson", function(err, data) {
  stopLayer = L.featureGroup();

  data.features.forEach(function(d) {
    var latlng = new L.LatLng(d.geometry.coordinates[1], d.geometry.coordinates[0]),
        marker = new L.circleMarker(latlng, style).addTo(map);

    marker.bindPopup(d.properties.name + "[" + d.properties.id + "]<br><br><button class='btn btn-primary btn-sm select'>Select</button>");

    marker.data = d.properties;
    stopLayer.addLayer(marker);
  });
  
  stopLayer.addTo(map);
});

d3.selectAll(".select")
  .on("click", function(d) {
    openMarker.setStyle({
      color:"#60AB6E",
      fillColor: "#6bb178"
    });
  });

map.on("zoomend", function() {
  console.log("fired");

  var zoom = map.getZoom(),
      scaler;

  switch(zoom) {
    case 13: 
      scaler = 3;
      break;
    case 14:
      scaler = 3.5;
      break;
    case 15:
      scaler = 5;
      break;
    case 16:
      scaler = 8;
      break;
    case 17:
      scaler = 13;
      break;
    case 18:
      scaler = 15;
      break;
    default:
      scaler = 2;
      break;
  };

  console.log("zoom = ", zoom, " scaler = ", scaler);

  stopLayer.eachLayer(function(d) {
    d.setRadius(scaler);
  });
});

map.on("popupopen", function(e) {
  var openMarker = e.popup._source;

  d3.selectAll(".select")
    .on("click", function(d) {
      if (selectedStops.indexOf(openMarker.data.id) < 0) {
        map.closePopup();

        if (selectedStops.length < 1) {
          d3.select(".selected-stops-div").style("display", "block");
        }
        
        selectedStops.push(openMarker.data.id);

        selectedMarkers[openMarker.data.id] = openMarker;

        d3.select(".selected-stops").append("tr").append("td")
          .html(openMarker.data.name + "<i class='ion-ios7-minus-outline remove'></i>")
          .attr("id", openMarker.data.id);

        d3.selectAll(".remove")
          .on("click", function(d) {
            var parent = d3.select(this).node().parentNode,
                id = d3.select(parent).attr("id"),
                index = selectedStops.indexOf(id);

            selectedMarkers[id].setStyle({fillColor: "#719fbd",color: "#6597B8"});

            // Clean up
            selectedStops.splice(index, 1);
            delete selectedMarkers[id];
            d3.select(this).node().parentNode.remove();

            if (selectedStops.length < 1) {
              d3.select(".selected-stops-div").style("display", "none");
            }

          });

        openMarker.setStyle({
          color:"#60AB6E",
          fillColor: "#6bb178"
        });
      }
      
    });
});

d3.select(".bookmark").on("click", function() {
  if (selectedStops.length < 1) {
    return alert("Please select at least one stop");
  } else {
    var url = "/a/";

    selectedStops.forEach(function(d) {
      url += d + "/";
    });
    
    url = url.substring(0, url.length - 1);

    window.location = url;
  }
});