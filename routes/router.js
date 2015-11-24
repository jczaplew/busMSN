var http = require('http'),
    fs = require('fs'),
    async = require('async'),
    apiKey = require('./apiKey'),
    distance = require('turf-distance'),
    point = require('turf-point'),
    moment = require('moment'),
    request = require('request'),
    cheerio = require('cheerio'),
    pg = require('pg'),
    LRU = require('lru-cache'),
    credentials = require('./credentials');

// Quickly validate stops
var stop_hash = {};

// Max cache size of 20mb and max age of 1 minute
var lruOptions = {
  max: 20000000,
  maxAge: 60000
}

// Define the cache
var cache = LRU(lruOptions);

function queryPg(sql, params, callback) {
  pg.connect("postgres://" + credentials.pg.user + "@" + credentials.pg.host + "/" + credentials.pg.database, function(err, client, done) {
    if (err) {
      console.log("error connecting - " + err);
      callback(err);
    } else {
      var query = client.query(sql, params, function(err, result) {
        done();
        if (err) {
          console.log("error", err);
          callback(err);
        } else {
          callback(null, result);
        }

      });
     // console.log(query);
    }
  });
};

function getTimes(stop_id, cb) {
  async.waterfall([
    function(callback) {
      var cached = cache.get(stop_id);

      if (cached) {
        console.log('cache hit!')
        return cb(cached);
      }

      console.log('cache miss');

      callback(null);
    },

    function(callback) {
      queryPg('SELECT rsd.route_id, rsd.direction_id, rsd.stop_id FROM route_stop_directions rsd LEFT JOIN stops_scraped ON stops_scraped.stop_id = rsd.stop_id WHERE stops_scraped.gtfs_id = $1', [stop_id.toString()], function(error, response) {
        if (error) {
          console.log(error);
        }
        callback(null, response.rows);
      });
    },

    function(times, callback) {
      // This holds the output
      var out = [];

      async.eachLimit(times, 10, function(tuple, callback) {
        request('http://webwatch.cityofmadison.com/webwatch/MobileAda.aspx?r=' + tuple.route_id + '&d=' + tuple.direction_id + '&s=' + tuple.stop_id, function(error, response, body) {
          if (error) {
            console.log(error);
          }
          $ = cheerio.load(body);

          $('div[align=Left]').html().split('<br>').forEach(function(d) {
            if (!(isNaN(d.trim().substr(0, 1))) && d.trim().length) {
              var data = d.trim().split(' TO ');
              var time = data[0].replace(/\./g, '').trim();
              var until = moment(time, 'hh:mm A').diff(moment(), 'minutes');

              out.push({
                r: tuple.route_id,
                d: data[1].trim(),
                t: time,
                u: until
              });
            }
          });

          callback(null);

        });
      }, function(error) {
        if (error) {
          callback(error);
          console.log(error);
        }

        out.sort(function(a, b) {
          return a.u - b.u;
        });

        callback(null, out);
      });
    },

    // Set the cache
    function(times, callback) {
      cache.set(stop_id, times);
      callback(null, times);
    }

  ], function(error, times) {
    cb(times);
  });

}

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
  console.log('send initial');
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
    return;
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
          return;
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
    getTimes(stopNames[0].id, function(times) {
      if (!(times.length)) {
        res.render('error_init', {
          'selectStops': stopNames,
          'closestStop': stopNames[0],
          'message': 'No buses on the horizon :-(. Check a different stop.'
        });
      } else {
        stopNames[0].routes = times;
        res.render('stop_menu', {
          'selectStops': stopNames,
          'closestStop': stopNames[0],
          'firstBus': times[0]
        });
      }
    });
  });
}

/* Route for getting arrivals for a single stop.
   Used when user clicks on stop in sidebar.*/
exports.times = function(req, res) {
  getTimes(req.query.id, function(times) {
    res.render('stop', {
      'arrivals': times,
      'firstBus': times[0]
    });
  });
}
