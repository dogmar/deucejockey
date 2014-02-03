'use strict';

var express = require('express'),
	  io = require('socket.io'),
	  server = require('http'),
	  jade = require('jade'),
	  stylus = require('stylus'),
	  nib = require('nib'),
	  prefixer = require('autoprefixer-stylus'),
	  app = express();

console.log('running from:', process.cwd());
app.use('/', express.static('./static'));
app.get('/', function(req, res) {
  res.send('hello world');
});

app.listen(3000);
process.on('SIGINT', function () {
  console.log("Closing");
  board.analogWrite(pSpeed, 0);
  app.close();
});

var five = require("johnny-five"),
	board = new five.Board();
var pFwd, pRev, pSpeed = 3;

console.log('what?');

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


