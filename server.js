var express = require('express'),
  cons = require('consolidate'),
  app = express();

app.use(express.logger());

// assign the Mustache engine to .html files
app.engine('html', cons.mustache);

// set .html as the default extension for views
app.set('view engine', 'html');
 
// Identify where the view templates live
app.set('views', __dirname + '/views');

// Point the server to static files in the /public dir
app.use(express.static(__dirname + '/public'));

// GZIP responses
app.use(express.compress());

app.enable('trust proxy');

// Simple page routes
app.get('/', function(req, res) {
  res.send("Up and running");
});

// Handle 404
app.use(function(req, res) {
   res.send('404: Page not Found', 404);
});

// Handle 500
app.use(function(error, req, res, next) {
   res.send('500: Internal Server Error', 500);
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on port " + port);
});