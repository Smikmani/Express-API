var express = require('express'); 
var path = require('path'); 
var logger = require('morgan'); 
var bodyParser = require('body-parser');
var responseTime = require('response-time'); 
var assert = require('assert'); 
var helmet = require('helmet'); 
var RateLimit = require('express-rate-limit'); 
var csp = require('helmet-csp');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

var users = require('./routes/users');
var session = require('./routes/session');
var artists = require('./routes/artists');

var app = express();
app.enable('trust proxy'); 




var limiter = new RateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,  
  delayMs: 0  
});
app.use(limiter);

app.use(helmet()); 
app.use(csp({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'ajax.googleapis.com', 'maxcdn.bootstrapcdn.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'maxcdn.bootstrapcdn.com'],
    fontSrc: ["'self'", 'maxcdn.bootstrapcdn.com'],
    imgSrc: ['*']
  }
}));

app.use(responseTime());

app.use(logger('dev'));

app.use(bodyParser.json({ limit: '100kb' }));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// app.use(express.static(path.join(__dirname, 'build')));

var db = {};
var MongoClient = require('mongodb').MongoClient;

MongoClient.connect(process.env.MONGODB_CONNECT_URL, function (err, client) {
  assert.equal(null, err);
  db.client = client;
  db.collection = client.db('newswatcherdb').collection('newswatcher');
  console.log("Connected to MongoDB server");
});


process.on('SIGINT', function () {
  console.log('MongoDB connection close on app termination');
  db.client.close();
});

process.on('SIGUSR2', function () {
  console.log('MongoDB connection close on app restart');
  db.client.close();
});

app.use(function (req, res, next) {
  req.db = db;
  next();
});


app.use('/api/users', users);
app.use('/api/sessions', session);
app.use('/api/artists', artists);


app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler that will add in a stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) { // eslint-disable-line no-unused-vars
    res.status(err.status || 500).json({ message: err.toString(), error: err });
    console.log(err);
  });
}

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + server.address().port);
});

server.db = db;
module.exports = server;