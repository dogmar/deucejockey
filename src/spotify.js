var querystring = require('querystring')
	, https = require('https')
	Q = require('q')
;

var my_client_id = 'c67b1eda57a249c7b83a4fa2abdce114'; // Your client id
var my_secret = '9da7cf2757974f549e111dbb66cb793e'; // Your secret

function getToken() {
	var deferred = Q.defer();


	var postData = querystring.stringify({
		'grant_type' : 'client_credentials',
		'scope': ''
	});

	var reqOptions = {
		hostname: 'accounts.spotify.com',
		path: '/api/token',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length,
			'Authorization': 'Basic ' + new Buffer(my_client_id+':'+my_secret).toString('base64')
		}
	};

	var req = https.request(reqOptions, function(res) {
		console.log(res.statusCode);
		var body = ''
		res.on('data', function(chunk) {
			body += chunk
		});
		res.on('end', function() {
			body = JSON.parse(body);
			deferred.resolve(body.access_token)
		})
	});
	req.write(postData);
	req.end();

	return deferred.promise;
}

function getSpotify(path, token) {
	var deferred = Q.defer();

	var reqOptions = {
		hostname: 'api.spotify.com',
		path: path,
		method: 'GET',
		headers: {
			// 'Content-Type': 'application/x-www-form-urlencoded',
			// 'Content-Length': postData.length,
			'Authorization': 'Bearer ' + token
		}
	};

	var req = https.request(reqOptions, function(res) {
		console.log(res.statusCode);
		// console.log(res);

		var body = ''
		res.on('data', function(chunk) {
			body += chunk
		});
		res.on('end', function() {
			// console.log(body);
			try {
				body = JSON.parse(body);
			} catch (e) {
				console.log(e);
			}
			deferred.resolve(body)
		})
	});
	req.end();

	return deferred.promise;
}

var token;


function getPlaylist(token, uri) {
	var deferred = Q.defer()
		, user
		, playlistID
	;

	uri =  uri.split(':');
	user = uri[2];
	playlistID = uri[4];
	// console.log('user:', user);
	// console.log('id:', playlistID);

	getSpotify('/v1/users/'+user+'/playlists/'+playlistID, token)
		.then(function(playlist){
			var pl = [];
			// console.log(playlist.tracks.items);
			playlist.tracks.items.forEach(function(item){
				// console.log(item.track.name, item.track.uri);
				pl.push({
					'name': item.track.name,
					'uri': item.track.uri
				})
			});
			deferred.resolve(pl);
		})
	;

	return deferred.promise;
}

exports.getPlaylist = getPlaylist;
exports.getToken = getToken;