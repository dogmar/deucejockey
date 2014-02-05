// process.on('SIGINT', function() {

// 	console.log('my SIGINT');
// 	// require('sleep').sleep(5);
// });
// process.on('exit', function() {

// 	console.log('my exit');
// 	// require('sleep').sleep(5);
// });

var express = require('express'),
	  io = require('socket.io'),
	  server = require('http'),
	  jade = require('jade'),
	  stylus = require('stylus'),
	  nib = require('nib'),
	  prefixer = require('autoprefixer-stylus'),
	  io = require('socket.io'),
	  app = express();

console.log('running from:', process.cwd());
app.use('/', express.static(__dirname + '/static'));
app.get('/', function(req, res) {
  res.send('hello world');
});

app.listen(3000);

app.set('views', __dirname + '/tpl');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res){
    res.render("page");
});


var five = require("johnny-five"),
	board = new five.Board();
board.addListener('error', function(e) {
	console.log(e.message);
});
var pFwd, pRev, pSpeed = 3;

board.on("ready", function() {
	console.log('board ready');

	pFwd = new five.Pin(4);
	pRev = new five.Pin(7);
	board.pinMode(pSpeed, five.Pin.PWM);
	board.analogWrite(pSpeed, 0);
	pFwd.high();
	pRev.low();

	require('./process-audio').on('update', function(e) {
		console.log('intensity:', e.intensity);
		var pinOut = Math.floor(e.intensity * 255) * 10;
		if (pinOut > 255) {
			pinOut = 255;
		}
		board.analogWrite(pSpeed, pinOut);
	});
});


