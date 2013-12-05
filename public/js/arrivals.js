//#/0758/0581/0490
var busTimes = (function() {
  var requestedStops = [],
      stops = [],
      stop_hash = {},
      closestStop, closestDist,
      selectedStop;
  
  // Helper function for finding the index of an object that contains a property with a particular value
  function getIndex(data, term, property) {
    for(var i=0, len=data.length; i<len; i++) {
      if (data[i][property] === term) return i;
    }
    return -1;
  }

  // via http://stackoverflow.com/questions/27928/how-do-i-calculate-distance-between-two-latitude-longitude-points
  // Finds distance between two lat/lons
  function distance(lat1,lon1,lat2,lon2) {
    var R = 6371000, // Radius of the earth in m
        dLat = deg2rad(lat2-lat1),  // deg2rad below
        dLon = deg2rad(lon2-lon1);

    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)),
        d = R * c; // Distance in m

    return d;
  }

  // Helper for distance()
  function deg2rad(deg) {
    return deg * (Math.PI/180)
  }

  function getStopInfo(stop, lat, lng, callback) {
    var dist = distance(lat, lng, stop_hash[stop].lat, stop_hash[stop].lng);
        stop_hash[stop].dist = dist;

    busTimes.stops.push(stop_hash[stop]);
    callback(null, true);
  }

  function locationError(error) {
    $("#firstRoute").html("Error retrieving current location(" + error.code + ") - " + error.message);
    $("#loading").css("visibility", "hidden");
    $(".primaryContent").css("visibility", "visible");
    $("#minutes").css("visibility", "hidden");
  }

  function locationFound(position) {
    var lat = position.coords.latitude,
        lng = position.coords.longitude;

    var q = queue();

    busTimes.requestedStops.forEach(function(d) {
      if (d.length > 0) {
        q.defer(getStopInfo, d, lat, lng);
      }
    });

    q.awaitAll(function(error, results) { 

      var ul = d3.select("nav ul");
    //TODO: sort the stops by distance before adding to the sidebar
      ul.selectAll(".stops")
        .data(busTimes.stops)
      .enter().append("li").append("a")
        .attr("href", "#")
        .attr("id", function(d) { return d.id; })
        .attr("class", "stop")
        .html(function(d) { return d.name; })
        .on("click", function(d) {
          d3.event.preventDefault();
          busTimes.selectedStop = d;
          busTimes.goToStop(d);
        });

      queue(1)
        .defer(getClosestDist)
        .awaitAll(firstArrivals)
    });

  }

  function firstArrivals() {
    busTimes.selectedStop = busTimes.stops[closestStop];
    busTimes.goToStop(busTimes.stops[closestStop]);
  }

  function getClosestDist(callback) {
    closestDist = Math.min.apply(Math, busTimes.stops.map(function(d){return d.dist;}));
    closestStop = getIndex(busTimes.stops, closestDist, "dist");
    callback(true);
  }

  function getAllStops(callback) {
    d3.json("js/stops.geojson", function(err, data) {

      data.features.forEach(function(d) {
        var stop = d.properties;
        stop.lat = d.geometry.coordinates[1];
        stop.lng = d.geometry.coordinates[0];
        stop_hash[stop.id] = stop;
      });

      callback(true);

    });
  }

  return {
    "init": function() {
      $("#loading").css("visibility", "visible");

      $("#menu-toggle").on("click", function(e) {
        e.preventDefault();
      });

      $('nav#menu-left').mmenu();

      var location = window.location,
        state = location.hash.substr(2);
      
      busTimes.requestedStops = state.split("/");

      if (busTimes.requestedStops[0].length > 0) {
        $("#content").load("views/arrivals.html");

        queue(1)
          .defer(getAllStops)
          .awaitAll(busTimes.getLocation);

      } else {
        $("#content").load("views/main.html");
        $("#firstRoute").html("Please provide at least one stop ID in the URL");
        $("#loading").css("visibility", "hidden");
        $(".primaryContent").css("visibility", "visible");
        $("#minutes").css("visibility", "hidden");
      }
      
    },

    "getLocation": function() {
      var options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }

      // via https://groups.google.com/forum/#!topic/smsmybus-dev/xmJ-CUxxBn8
      navigator.geolocation.getCurrentPosition(locationFound, locationError, options);
    },

    "goToStop": function(stop) {
      if (stop && stop.id != 'undefined') {
        $(".primaryContent").css("visibility", "hidden");
        $("#loading").css("visibility", "visible");
        $('nav#menu-left').mmenu().trigger( "close.mm" );
        $(".navbar-brand").html(stop.name);

        // If we have already requested arrivals for this stop...
        if (stop.routes) {
          // And at least one arrival time was returned...
          if (stop.routes.length > 0) {
            busTimes.routesFound(stop);
          // If we requested arrivals, and none were found...
          } else {
            busTimes.noneFound();
          }
        // If we haven't asked for arrivals yet, ask for them
        } else {
          $.ajax({
            dataType:'jsonp',
            url: 'http://api.smsmybus.com/v1/getarrivals?key=czaplews&stopID=' + stop.id,
            success: function(data) {
              // -1 indicates no arrivals were found
              if (data.status === "-1") {

                busTimes.noneFound();

                var index = getIndex(busTimes.stops, stop.id, "id");
                // Note that none were found
                busTimes.stops[index].routes = [];
                
              } else {

                var index = getIndex(busTimes.stops, stop.id, "id");
                // Cache the arrivals so we don't need a redundant AJAX request if needed again
                busTimes.stops[index].routes = data.stop.route;

                busTimes.routesFound(busTimes.stops[index]);

              }
            }
          });
        }
      }
    },

  //TODO: not currently used. Hook it up to the UI somehow
    "refresh": function() {
      busTimes.goToStop(busTimes.selectedStop);
    },

    "noneFound": function() {
      $("#firstRoute").html("No buses found");
      $("#first").html("");
      $("#nextArrivalTable").html("");
      $("#minutes").css("visibility", "hidden");
      $("#loading").css("visibility", "hidden");
      $(".primaryContent").css("visibility", "visible");
    },

    "routesFound": function(stop) {
      $("#firstRoute").html("Route " + stop.routes[0].routeID + " in");
      $("#first").html(stop.routes[0].minutes);

      $("#minutes").css("visibility", "visible");

      var template = '{{#routes}}<tr><td>Route {{routeID}}</td><td>{{minutes}} minutes</td></tr>{{/routes}}';
  
      var output = Mustache.render(template, stop);

      $("#nextArrivalTable").html(output);

      $("#loading").css("visibility", "hidden");
      $(".primaryContent").css("visibility", "visible");
    },

    "stops": stops,
    "requestedStops": requestedStops,
    "selectedStop": selectedStop

  }

})();

busTimes.init();