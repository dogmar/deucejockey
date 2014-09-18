var events = require('events')
	, cp = require('child_process')
	, http = require('http')
	, _ = require('lodash')
	, keypress = require('keypress')
;


var songs = {
	'panama': '11dCfArPrM7kzYpUrFHal9'
}

var commands = []
commands[2] = '/next';
commands[3] = '/play-track/spotify:track:'+songs.panama;

var reqOptions = {
	hostname: '10.201.178.52',
	port: 52552,
	path: '/next',
	method: 'GET'
};

var timeout;
console.log('running from:', process.cwd());

var resetTime = 1.5 // in seconds
	, claps = []
	// , timeout
	, detectorProcess
;


console.log('main process: ', process.pid);
process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);
process.on('SIGHUP', gracefulExit);
process.on('uncaughtException', function(err) {
	console.log('Caught exception: ' + err);
	console.log(err.stack);
	gracefulExit();
});

function gracefulExit() {
	if(detectorProcess) {
		console.log('Killing old process: ', detectorProcess.pid);
		detectorProcess.kill();
	}
}


var lazyCountClaps = _.debounce(countClaps, resetTime * 1000);

function onClap(clap) {
	claps.push(clap);
	lazyCountClaps();
	console.log('claps length:', claps.length);
}


function countClaps(e) {
	console.log('countclaps', claps.length);
	if (claps.length >= 2 && claps.length < commands.length) {
		console.log('<<<<<<<<<<<<<<<<<< COMMAND #' + claps.length + '! >>>>>>>>>>>>>>>>>')
		reqOptions.path = commands[claps.length]
		var req = http.request(reqOptions, function(res) {
			console.log('STATUS: ' + res.statusCode);
		});
		req.end();
	}
	claps = [];
}

function spawnDetector() {
	// kill previous spawned process
	if(detectorProcess) {
		console.log('Killing old process: ', detectorProcess.pid);
		detectorProcess.kill();
	} else {
		detectorProcess = cp.spawn('python', [__dirname+'/clap-detect.py'], {stdio: [process.stdin, 'pipe', null]});
		detectorProcess.on('close', detectorProcessClosed);
		detectorProcess.stdout.on('data', readDetector)
		console.log('spawning detector', detectorProcess.pid);

	}
}


function readDetector(buffer) {
	console.log('<<<<DATA>>>>>');
	var data = buffer.toString('utf-8')
	var lines = data.split('\n');

	for (var i = 0; i < lines.length; ++i) {
		try {
			var json = JSON.parse(lines[i]);
			if (json.clap) {
				onClap(json.clap);
				console.log(json);
			}
		} catch (e) {
			// console.log('invalid json:', e, lines[i]);
		}
	}

}


function detectorProcessClosed() {
	console.log('closed')
	detectorProcess = null;
	// spawnChildren();
}


try {
	spawnDetector();
} catch (e) {
	console.log(e);
}

