var events = require('events');
var coreAudio = require('node-core-audio');
var dsp = require('digitalsignals');
var engine = coreAudio.createNewAudioEngine();

// Add an audio processing callback
// This function accepts an input buffer coming from the sound card,
// and returns an ourput buffer to be sent to your speakers.
var rate = 44100;
var sampleLength = 1024;
var fft;

module.exports = new events.EventEmitter();

engine.addAudioCallback( processAudio );


// Note: This function must return an output buffer
function processAudio( inputBuffer ) {
	var mic = inputBuffer[0], spectrum;
	if (mic.length <= 0) {
		return;
	}
	// console.log('rate:'+mic.rate);

	if (!fft || inputBuffer.rate != rate || inputBuffer.length != sampleLength) {
		// console.log('no fft');
		rate = inputBuffer.rate;
		sampleLength = mic.length;
		fft = new dsp.FFT(sampleLength, rate);
	}
	fft.forward(mic);
	spectrum = fft.spectrum;
	// console.log( spectrum.length + " spectrum length" );
	var bins = binData(spectrum, 80);
	for (var i = 0; i < 8; ++i) {
		// console.log('bin['+i+']: ' + bins[i]);
	}

	module.exports.emit('update', {intensity: bins[0]})

	// return inputBuffer;
}

function binData(array, bins) {
	var len = array.length;
	var i = 0, j = 0;
	var binSize = len / bins;
	binArray = new Float32Array(bins);
	for (var i = 0; i < binArray.length; ++i) {
		binArray[i] = 0;
	}

	for (var i = 0; i < len; ++i) {
		j = Math.floor(i / binSize);
		binArray[j] += array[i];
	}

	return binArray;
}

console.log(module.exports);