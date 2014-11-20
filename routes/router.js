var http = require('http'),
    fs = require('fs'),
    async = require('async'),
    apiKey = require('./apiKey'),
    distance = require('turf-distance'),
    point = require('turf-point'),
    stop_hash = {};

// Read in and parse the stops
(function() {
  var appRoot = process.cwd(),
      file = appRoot + '/public/js/stops.geojson';

  fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
      console.log('Error: ' + err);
      return;
    }

    var stops = JSON.parse(data);
    async.each(stops.features, function(item, callback) {
      item.properties.lat = item.geometry.coordinates[1];
      item.properties.lng = item.geometry.coordinates[0];
      stop_hash[item.properties.id] = item.properties;

      callback()
    }, function(){
      return;
    });
  });
})();

// For sorting distances of stops
function compare(a,b) {
  if (a.dist < b.dist)
     return -1;
  if (a.dist > b.dist)
    return 1;
  return 0;
}

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
      requestedStops = req.query.stops.split(",");

  if (requestedStops.length < 1) {
    res.render('error', {
      'message': 'Error loading data: please provide at least one stop.'
    });
  }

  var stopNames = [];

  async.waterfall([
    // Lookup requested stop names and locations by ID
    function(callback) {
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
          callback(null);
        }
      });
    },

    // Find distance between each requested stop and current user location
    function(callback) {
      async.each(stopNames, function(item, callback) {
        item.dist = distance(point(lat, lng), point(item.lat, item.lng), 'kilometers');

        callback();
      }, function() {
        // Sort requested stops by distance from user
        stopNames.sort(compare);
        callback(null);
      });
    }

    // Get data from smsmybus API
  ], function(error, result) {
    http.get('http://api.smsmybus.com/v1/getarrivals?key=' + apiKey.apiKey + '&stopID=' + stopNames[0].id, function(response) {
      var body = '';

      response.on('data', function(chunk) {
        body += chunk;
      });

      response.on('end', function() {
        var data = JSON.parse(body);

        if (data.status === "-1") {
          res.render('error_init', {
            'selectStops': stopNames,
            'closestStop': stopNames[0],
            'message': 'No buses on the horizon :-(. Check a different stop.'
          });
        } else {
          stopNames[0].routes = data.stop.route;

          // Create a template and send it pre-rendered!
          res.render('stop_menu', {
            'selectStops': stopNames,
            'closestStop': stopNames[0],
            'firstBus': stopNames[0].routes[0]
          });
        }
      });
    });
  });
}

/* Route for getting arrivals for a single stop.
   Used when user clicks on stop in sidebar.*/
exports.times = function(req, res) {
  http.get('http://api.smsmybus.com/v1/getarrivals?key=' + apiKey.apiKey + '&stopID=' + req.query.id, function(response) {
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
          'arrivals': data,
          'firstBus': data.stop.route[0]
        });
      }
    });
  });
}