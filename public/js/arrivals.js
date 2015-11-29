//TODO: Clean up jQUery hell
var busTimes = (function() {
  var snapper,
      countdown;

  function getData(lat, lng) {
    var loc = window.location,
        state = loc.pathname.substr(2),
        path = state.split("/"),
        requestedStops = [];

    path.forEach(function(item) {
      if (item.length > 1) {
        requestedStops.push(item);
      };
    });

    $("#refresh, #countdown").on("click", function() {
      busTimes.refreshStop($(".navbar-brand").attr("id"));
    });

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

        $(".navbar-brand")
          .html($("#closestStop").html())
          .attr("id", $("#closestStop").attr("data-stopid"));

        adjustFooter();

        busTimes.setTimer();

        $(".stop").on("click", function(event) {
          event.preventDefault();
          $(".snap-drawer li > a").css("color", "#777");
          $(this).css("color", "#FF992C");
          var id = $(this).attr("id");
          $(".navbar-brand").html($(this).html());
          $(".navbar-brand").attr("id", $(this).attr("id"));
          busTimes.goToStop(id);
          snapper.close();
        });
      }
    });
  }

  function adjustFooter() {

    var height = window.innerHeight - $(".navbar").height() - $(".arrivalRow").height() - 40;
    height = Math.abs(height);
    height += "px";

    $(".arrivalRow").css("margin-bottom", height);

    $("#footer").css("visibility", "visible");
  }

  return {
    "init": function() {
      $("#loading").css("visibility", "visible");
      //$("#footer").css("visibility", "hidden");

      FastClick.attach(document.body);

      snapper = new Snap({
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

      busTimes.getPosition();
    },

    "getPosition": function() {
      // via https://groups.google.com/forum/#!topic/smsmybus-dev/xmJ-CUxxBn8
      navigator.geolocation.getCurrentPosition(
        function(position) {
          var lat = position.coords.latitude,
              lng = position.coords.longitude;

          getData(lat,lng);
        },
        function(error) {
          if (window.confirm("Error retrieving current location. Would you like to try again?")) {
            return busTimes.getPosition();
          }
          // Default to ~ University & Park
          var lat = 43.07325,
              lng = -89.40074;

          getData(lat, lng);
        }, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 100
      });

    },

    "goToStop": function(stop) {
      busTimes.stopTimer();
      $("#loading").css("visibility", "visible");
      $("#footer").css("visibility", "hidden");

      $(".primaryContent").css("visibility", "hidden");

      $.ajax({
        url: '/times?id=' + stop,
        success: function(data) {
          $("#firstArrivalHolder").html(data);
          $("#loading").css("visibility", "hidden");
          adjustFooter();
          $(".primaryContent").css("visibility", "visible");
          busTimes.setTimer();
        }
      });
    },

    "refreshStop": function(stop) {
      busTimes.stopTimer();
      $("#refresh")
        .removeClass("ion-ios7-refresh-empty")
        .addClass("ion-ios7-reloading");
      $.ajax({
        url: '/times?id=' + stop,
        success: function(data) {
          $("#firstArrivalHolder").html(data);
          adjustFooter();
          $(".primaryContent").css("visibility", "visible");
          busTimes.setTimer();
          $("#refresh")
            .removeClass("ion-ios7-reloading")
            .addClass("ion-ios7-refresh-empty");
        }
      });
    },

    "setTimer": function() {
      $("#countdown")
        .show();

      var start = new Date().getTime(),
          refresh = start + 61000;

      countdown = setInterval(function() {
        var current = new Date().getTime();
        $("#countdown").html(parseInt((refresh - current)/1000));

        if(parseInt((refresh - current)/1000) === 9) {
          $("#countdown").css("right", "3.36em");
        }

        if ((refresh - current) < 1) {
          $("#countdown").hide();
          clearInterval(countdown);
          busTimes.refreshStop($(".navbar-brand").attr("id"));
        }
      }, 1000);
    },

    "stopTimer": function() {
      clearInterval(countdown);
      $("#countdown").hide();
    },

    "resetTimer": function() {
      clearInterval(countdown);
      busTimes.setTimer();
    },

    "countdown": countdown
  }

})();

busTimes.init();
