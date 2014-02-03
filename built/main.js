'use strict';

// Create a new instance of node-core-audio
var coreAudio = require('node-core-audio');
var dsp = require('digitalsignals');

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
	board.analogWrite(pSpeed, 255);
	pFwd.high();
	pRev.low();

	// engine.addAudioCallback( processAudio );
});

board.on('exit', function() {
	console.log('board exit');
})


// // Create a new audio engine
// // var engine = coreAudio.createNewAudioEngine();

// // Add an audio processing callback
// // This function accepts an input buffer coming from the sound card,
// // and returns an ourput buffer to be sent to your speakers.
// var rate = 44100;
// var sampleLength = 1024;
// var fft;

// // Note: This function must return an output buffer
// function processAudio( inputBuffer ) {
// 	var mic = inputBuffer[0], spectrum;
// 	if (mic.length <= 0) {
// 		return;
// 	}
// 	// console.log('rate:'+mic.rate);

// 	if (!fft || inputBuffer.rate != rate || inputBuffer.length != sampleLength) {
// 		// console.log('no fft');
// 		rate = inputBuffer.rate;
// 		sampleLength = mic.length;
// 		fft = new dsp.FFT(sampleLength, rate);
// 	}
// 	fft.forward(mic);
// 	spectrum = fft.spectrum;
// 	// console.log( spectrum.length + " spectrum length" );
// 	var bins = binData(spectrum, 80);
// 	for (var i = 0; i < 8; ++i) {
// 		console.log('bin['+i+']: ' + bins[i]);
// 	}

// 	var pinOut = Math.floor(bins[0] * 255) * 10;
// 	if (pinOut > 255) {
// 		pinOut = 255;
// 	}
// 	console.log(pinOut);
// 	board.analogWrite(pSpeed, pinOut);

// 	return [];

//     // return inputBuffer;
// }

// function binData(array, bins) {
// 	var len = array.length;
// 	var i = 0, j = 0;
// 	var binSize = len / bins;
// 	binArray = new Float32Array(bins);
// 	for (var i = 0; i < binArray.length; ++i) {
// 		binArray[i] = 0;
// 	}

// 	for (var i = 0; i < len; ++i) {
// 		j = Math.floor(i / binSize);
// 		binArray[j] += array[i];
// 	}

// 	return binArray;
// }
