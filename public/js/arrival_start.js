//#/0758/0581/0490
var busTimes = (function() {
  var requestedStops = [],
      stops = [],
      selectedStop;


  function locationError(error) {
    alert("Error retrieving current location. Please refresh and allow the browser to access your location");
  }

  function locationFound(position) {
    var lat = position.coords.latitude,
        lng = position.coords.longitude;

    var loc = window.location,
        state = loc.pathname.substr(2);
      
    var path = state.split("/");

    var requestedStops = [];

    path.forEach(function(item) {
      if (item.length > 1) {
        requestedStops.push(item);
      };
    });


    $.ajax({
      url: '/location?lat=' + lat + '&lng=' + lng + '&stops=' + requestedStops.toString(),
      success: function(data) {
        $(".arrivalRow").html(data);
        $('nav#menu-left').mmenu();
        $("#loading").css("visibility", "hidden");
        $(".primaryContent").css("visibility", "visible");

        $(".navbar-brand").html($("#closestStop").html());

        $(".stop").on("click", function() {
          var id = $(this).attr("id");
          $(".navbar-brand").html($(this).html());
          busTimes.goToStop(id);
        });
      }
    });

  }

  return {
    "init": function() {
      $("#loading").css("visibility", "visible");

      $("#menu-toggle").on("click", function(e) {
        e.preventDefault();
      });
      
      var options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }

      // via https://groups.google.com/forum/#!topic/smsmybus-dev/xmJ-CUxxBn8
      navigator.geolocation.getCurrentPosition(locationFound, locationError, options);

    },

    "goToStop": function(stop) {
      $("#loading").css("visibility", "visible");
      $('nav#menu-left').mmenu().trigger( "close.mm" );
      $(".primaryContent").css("visibility", "hidden");

      $.ajax({
        url: '/times?id=' + stop,
        success: function(data) {
          $("#firstArrivalHolder").html(data);
          $("#loading").css("visibility", "hidden");
          $(".primaryContent").css("visibility", "visible");
        }
      });
    },

  /*  "goToStop": function(stop) {
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
    },*/

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