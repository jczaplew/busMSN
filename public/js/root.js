(function() {
  FastClick.attach(document.body);

  var selectedStops = [],
      selectedMarkers = {},
      stopLayer;

  var southWest = L.latLng(42.9483, -89.6044),
    northEast = L.latLng(43.1991, -89.1732),
    bounds = L.latLngBounds(southWest, northEast);

  var map = new L.map("map", {
    center: new L.LatLng(43.071772, -89.398155),
    zoom:13,
    minZoom:12,
    maxZoom:18,
    zoomControl: false,
    maxBounds: bounds
  });

  var attrib = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="https://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';

  var stamenLabels = new L.TileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {attribution: attrib}).addTo(map);

  // Get location
  var options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(locationFound, locationError, options);

  function locationFound(pos) {
    // If the user is not in the Madison area ignore their location
    if (pos.coords.latitude > 42.948381 && pos.coords.latitude < 43.1991 && pos.coords.longitude > -89.6044 && pos.coords.longitude < -89.1732) {
      map.setView([pos.coords.latitude, pos.coords.longitude], 16);
    }
  }

  function locationError() {
    // Meh
  }

  var style = {
    radius:10,
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

  d3.select("#loadingRoot").style("display", "none");

  d3.select("#map").style("visibility", "visible");


  map.on("popupopen", function(e) {
    var openMarker = e.popup._source;

    d3.selectAll(".select")
      .on("click", function(d) {
        if (selectedStops.indexOf(openMarker.data.id) < 0) {
          map.closePopup();

          if (selectedStops.length < 1) {
            d3.selectAll(".selected-stops-title").style("display", "block");
          }

          selectedStops.push(openMarker.data.id);

          selectedMarkers[openMarker.data.id] = openMarker;

          d3.selectAll(".selected-stops").append("tr").append("td")
            .html(openMarker.data.name + "<i class='ion-ios7-minus-outline remove'></i>")
            .attr("id", "s" + openMarker.data.id);

          d3.selectAll(".remove")
            .on("click", function(d) {
              // Get the context
              var parent = d3.select(this).node().parentNode,
                  id = d3.select(parent).attr("id").substr(1),
                  index = selectedStops.indexOf(id);

              // Color the selected marker
              selectedMarkers[id].setStyle({fillColor: "#719fbd",color: "#6597B8"});

              // Clean up
              selectedStops.splice(index, 1);
              delete selectedMarkers[id];
              d3.selectAll("#s" + id).each(function(d) {
                d3.select(this).node().parentNode.remove();
              });

              // Hide the heading if there aren't any stops selected
              if (selectedStops.length < 1) {
                d3.selectAll(".selected-stops-title").style("display", "none");
              }

            });

          openMarker.setStyle({
            color:"#60AB6E",
            fillColor: "#6bb178"
          });
        }

      });
  });

  // Listener for all the buttons in popups
  d3.selectAll(".select")
    .on("click", function(d) {
      openMarker.setStyle({
        color:"#60AB6E",
        fillColor: "#6bb178"
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

  // Show the footer
  d3.select("#footer").style("visibility", "visible");
})();
