//#/0758/0581/0490
var busTimes = (function() {

  function locationFound(position) {
    var lat = position.coords.latitude,
        lng = position.coords.longitude;

    getData(lat,lng);
  }

  function locationError(error) {
    alert("Error retrieving current location.");
    // Default to ~ University & Park 
    var lat = 43.07325,
        lng = -89.40074;

    getData(lat, lng);
  }

  function getData(lat, lng) {
    var loc = window.location,
        state = loc.pathname.substr(2);
      
    var path = state.split("/");

    var requestedStops = [];

    path.forEach(function(item) {
      if (item.length > 1) {
        requestedStops.push(item);
      };
    });

    // If no stops, render an error

    $.ajax({
      url: '/location?lat=' + lat + '&lng=' + lng + '&stops=' + requestedStops.toString(),
      success: function(data) {
        $(".arrivalRow").html(data);

        // Hack. Need to clean this up.
        if (document.getElementById("selectStops")) {
          document.getElementById("sidebarContent").appendChild(document.getElementById("selectStops"));
        }
        
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

      FastClick.attach(document.body);

      var snapper = new Snap({
          element: document.getElementById('content'),
          disable: 'right'
      });

      $("#menu-toggle").on("click", function(event) {
        event.preventDefault();
        var state = snapper.state();
        if (state.state === "closed") {
          snapper.open('left');
        } else {
          snapper.close('left');
        }
      });

      /* Prevent Safari opening links when viewing as a Mobile App */
      (function (a, b, c) {
        if(c in b && b[c]) {
            var d, e = a.location,
                f = /^(a|html)$/i;
            a.addEventListener("click", function (a) {
                d = a.target;
                while(!f.test(d.nodeName)) d = d.parentNode;
                "href" in d && (d.href.indexOf("http") || ~d.href.indexOf(e.host)) && (a.preventDefault(), e.href = d.href)
            }, !1)
        }
      })(document, window.navigator, "standalone");

      
      var options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }

      // via https://groups.google.com/forum/#!topic/smsmybus-dev/xmJ-CUxxBn8
      navigator.geolocation.getCurrentPosition(locationFound, locationError, options);

    },

    "goToStop": function(stop) {
      $("#loading").css("visibility", "visible");
      //$('nav#menu-left').mmenu().trigger( "close.mm" );
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
    }
  }

})();

busTimes.init();