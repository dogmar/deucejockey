var events = require('events')
	, cp = require('child_process')
	, http = require('http')
	, https = require('https')
	, _ = require('lodash')
	, keypress = require('keypress')
	, spotify = require('./spotify')
;




var argv = require('yargs')
		.options('h', {
			alias: 'host',
			default: 'localhost'
		})
		.options('p', {
			alias: 'port',
			default: '52552'
		})
		.argv



playlists = {
	'three claps': {
		uri:'spotify:user:chrisklink:playlist:0tnVywWS6zAg3cA4ngJq0Y',
		tracks: []
	},
	'four claps': {
		uri:'spotify:user:chrisklink:playlist:7Alk0zvCPDfgegFgWsnxuu',
		tracks: []
	},
	'panama': {
		uri:'spotify:user:chrisklink:playlist:6IpKpHltTCCUp5LrZDDAC8',
		tracks: []
	}
};

var songs = {
	'panama': 'spotify:track:11dCfArPrM7kzYpUrFHal9'
}

var albums = {
	'pure moods': 'spotify:album:0yB3m49PTZx8DtWADiO0oy'
}

var commands = {
	'next': '/next',
	'play': '/play-track/'
}

var reqOptions = {
	hostname: argv.host,
	port: argv.port,
	method: 'GET'
};

var timeout;

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


spotify.getToken().then(function(token) {
	for (var i in playlists) {

		(function (id) {
			spotify.getPlaylist(token, playlists[id].uri).then(function(tracks) {
				playlists[id].tracks = tracks;
				console.log('tracks:', playlists[id]);
			});
		})(i);
	}
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
	var playlistIdx = ''
		, trackIdx = 0
		, trackURI
	;

	console.log('countclaps', claps.length);
	if (claps.length >= 2) {
		console.log('<<<<<<<<<<<<<<<<<< TOTAL CLAPS: ' + claps.length + '! >>>>>>>>>>>>>>>>>')

		if (claps.length === 2) {
			command = commands.next;
		} else {
			switch (claps.length) {
				case 3:
					playlistIdx = 'three claps';
					break;
				case 4:
					playlistIdx = 'four claps';
					break;
				case 5:
					playlistIdx = 'panama';
					break;
				default:
					claps = [];
					return;
					break;
			}

			trackIdx = Math.floor(Math.random() * playlists[playlistIdx].tracks.length);

			command = commands.play + playlists[playlistIdx].tracks[trackIdx].uri;
		}

		requestCommand(command)

	}
	claps = [];
}

function requestCommand(path) {
		var opts = _.assign({path: path}, reqOptions);
		var req = http.request(opts, function(res) {
			console.log('Reign request status code: ' + res.statusCode);
		});
		req.end();
}

function spawnDetector() {
	// kill previous spawned process
	if(detectorProcess) {
		console.log('Killing old process: ', detectorProcess.pid);
		detectorProcess.kill();
	} else {
		detectorProcess = cp.spawn('python', [__dirname+'/clap-detect.py'], {stdio: [process.stdin, 'pipe', process.stderr]});
		detectorProcess.stdout.on('data', readDetector)
		console.log('spawning detector', detectorProcess.pid);
	}
}


function readDetector(buffer) {
	var data = buffer.toString('utf-8')
	var lines = data.split('\n');

	lines.forEach(function(line) {
		console.log(line);
		try {
			var json = JSON.parse(line);
			if (json.clap) {
				onClap(json.clap);
				console.log("CLAP!");
			}
		} catch (e) {
			// console.log('invalid json:', e, lines[i]);
		}
	});

}


// function detectorProcessClosed() {
// 	console.log('closed')
// 	detectorProcess = null;
// 	// spawnChildren();
// }


try {
	spawnDetector();
} catch (e) {
	console.log(e);
}

