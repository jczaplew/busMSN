var http = require('http'),
    fs = require('fs'),
    async = require('async'),
    apiKey = require('./apiKey');

// Route for root
exports.root = function(req, res) {
  res.render('root');
}

// Route for /a/*
exports.arrivals = function(req, res) {
  res.render('arrivals', {
    partials: {
      header: 'header',
      footer: 'footer'
    }
  });
}

// Called after /a/* and location is returned
exports.loadArrivals = function(req, res) {

  var lat = req.query.lat,
      lng = req.query.lng,
      requestedStops = req.query.stops;

  requestedStops = requestedStops.split(",");

  if (requestedStops.length < 1) {
    res.render('error', {
      'message': 'Error loading data: please provide at least one stop.'
    });
  }

  var stop_hash = {},
      stopNames = [],
      stops,
      closestStop,
      closestDist,
      selectedStop;

  getAllStops();

  function getAllStops(callback) {
    var appRoot = process.cwd(),
        file = appRoot + '/public/js/stops.geojson';
 
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) {
        console.log('Error: ' + err);
        return;
      }

      stops = JSON.parse(data);
      parseStops(stops);
    });

  }

  function parseStops(stops, callback) {
    async.each(stops.features, function(item, callback) {
      var stop = item.properties;
      stop.lat = item.geometry.coordinates[1];
      stop.lng = item.geometry.coordinates[0];
      stop_hash[stop.id] = stop;

      callback()
    }, function(){
      findSelected();
    });

  }

  function findSelected(callback) {
    async.each(requestedStops, function(item, callback) {
      if (stop_hash[item]) {
        stopNames.push(stop_hash[item]);
      }
      callback();
    }, function() {
      // If the stop IDs supplied are all invalid, send error
      if (stopNames.length < 1) {
        res.render('error', {
          'message': 'Error loading data: none of the supplied stops seem to be valid. Please try again.'
        });
      } else {
        getDistances();
      }
    });
  }

  function getDistances(callback) {
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

    async.each(stopNames, function(item, callback) {
      var dist = distance(lat, lng, item.lat, item.lng);
      item.dist = dist;

      callback();
    }, function() {
      getClosestDist();
    });
  }

  function getClosestDist() {
    function compare(a,b) {
      if (a.dist < b.dist)
         return -1;
      if (a.dist > b.dist)
        return 1;
      return 0;
    }
    stopNames.sort(compare);

    // Make sure we have at least one stop again
    if (stopNames[0]) {
      goToStop(stopNames[0]);
    } else {
      res.render('error', {
        'message': 'Error loading data: please provide at least one valid stop.'
      });
    }
    
  }

  function goToStop(stop) {
    http.get('http://api.smsmybus.com/v1/getarrivals?key=' + apiKey.apiKey + '&stopID=' + stop.id, function(response) {
      var body = '';

      response.on('data', function(chunk) {
        body += chunk;
      });

      response.on('end', function() {
        var data = JSON.parse(body);

        if (data.status === "-1") {
          res.render('error_init', {
            selectStops: stopNames,
            closestStop: stopNames[0],
            'message': 'No buses on the horizon :-(. Check a different stop.'
          });
        } else {
          stopNames[0].routes = data.stop.route;

          // Create a template and send it pre-rendered!
          res.render('stop_menu', {
            selectStops: stopNames,
            closestStop: stopNames[0],
            firstBus: stopNames[0].routes[0]
          });
        }
      });
    });
  }
}

/* Route for getting arrivals for a single stop.
   Used when user clicks on stop in sidebar.*/
exports.times = function(req, res) {
  var stop = req.query.id;

  http.get('http://api.smsmybus.com/v1/getarrivals?key=' + apiKey.apiKey + '&stopID=' + stop, function(response) {
    var body = '';

    response.on('data', function(chunk) {
      body += chunk;
    });

    response.on('end', function() {
      var data = JSON.parse(body);

      if (data.status === "-1") {
        res.render('error', {
          'message': 'No buses on the horizon :-(. Check a different stop.'
        });
      } else {
        res.render('stop', {
          arrivals: data,
          firstBus: data.stop.route[0]
        });
      }
    });
  });
}