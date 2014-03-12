var $ = require('jquery'),
	// Backbone = require('backbone'),
	Ractive = require('ractive'),
	Faces = require('./face-collection.js'),
	utils = require('../utils.js'),
	app = {};

require('ractive-backbone/Ractive-Backbone.js');
var clm = require('clm');
var pModel = require('pmodel');
// require('clmtrackr/clmtrackr-dev/clmtrackr.min.js');
// require('clmtrackr/clmtrackr-dev/models/model_pca_20_svm.js');

function checkLineIntersection(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
	// if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
	var denominator, a, b, numerator1, numerator2, result = {
			x: null,
			y: null,
			onLine1: false,
			onLine2: false
		};
	denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
	if (denominator === 0) {
		return result;
	}
	a = line1StartY - line2StartY;
	b = line1StartX - line2StartX;
	numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
	numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
	a = numerator1 / denominator;
	b = numerator2 / denominator;

	// if we cast these lines infinitely in both directions, they intersect here:
	result.x = line1StartX + (a * (line1EndX - line1StartX));
	result.y = line1StartY + (a * (line1EndY - line1StartY));
	/*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
	// if line1 is a segment and line2 is infinite, they intersect if:
	if (a > 0 && a < 1) {
		result.onLine1 = true;
	}
	// if line2 is a segment and line1 is infinite, they intersect if:
	if (b > 0 && b < 1) {
		result.onLine2 = true;
	}
	// if line1 and line2 are segments, they intersect if both of the above are true
	return result;
}

function pointDistance(x1, y1, x2, y2) {
	var yD, xD;
	yD = y2 - y1;
	xD = x2 - x1;
	return Math.sqrt((yD * yD) + (xD * xD));
}

(function() {
	'use strict';
	app.faces = new Faces();

	console.log('app length:', app.faces.length);
	app.faces.fetch();

	if (app.faces.length < 1) {
		console.log('length < 1', app.faces.length);
		app.faces.add(new app.Face());
		console.log('length < 1', app.faces.length);
	}
	while (app.faces.length > 1) {
		app.faces.pop();
	}

	var ractive = new Ractive({
		el: '#face-content',
		template: '#face-template',

		adaptors: ['Backbone']
	});

	ractive.set({
		faces: app.faces
	});


	(function() {
		var vid = document.getElementById('videoel');
		var overlay = document.getElementById('overlay');
		var overlayCC = overlay.getContext('2d');

		var ctrack = new clm.tracker({
			useWebGL: true
		});
		ctrack.init(pModel);

		// stats = new Stats();
		// stats.domElement.style.position = 'absolute';
		// stats.domElement.style.top = '0px';
		// document.getElementById('container').appendChild(stats.domElement);

		$(document).on('click', '#startbutton', function() {
			startVideo();
		});
		$(document).on('click', '#resetbutton', function() {
			ractive.set('faces[0].eyebrows.left.height', 0);
			ractive.set('faces[0].eyebrows.right.height', 1);
			app.faces.at(0).save();
		});

		function enablestart() {
			var startbutton = document.getElementById('startbutton');
			startbutton.value = 'start';
			startbutton.disabled = null;
		}

		var insertAltVideo = function(video) {
			if (window.supportsVideo()) {
				if (window.supportsOggTheoraVideo()) {
					video.src = './media/cap12_edit.ogv';
				} else if (window.supportsH264BaselineVideo()) {
					video.src = './media/cap12_edit.mp4';
				} else {
					return false;
				}
				//video.play();
				return true;
			} else {
				return false;
			}
		};

		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
		window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;

		// check for camerasupport
		if (navigator.getUserMedia) {
			// set up stream

			var videoSelector = {
				video: true
			};
			if (window.navigator.appVersion.match(/Chrome\/(.*?) /)) {
				var chromeVersion = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
				if (chromeVersion < 20) {
					videoSelector = 'video';
				}
			}

			navigator.getUserMedia(videoSelector, function(stream) {
				if (vid.mozCaptureStream) {
					vid.mozSrcObject = stream;
				} else {
					vid.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
				}
				vid.play();
			}, function() {
				insertAltVideo(vid);
				document.getElementById('gum').className = 'hide';
				document.getElementById('nogum').className = 'nohide';
				alert('There was some problem trying to fetch video from your webcam, using a fallback video instead.');
			});
		} else {
			insertAltVideo(vid);
			document.getElementById('gum').className = 'hide';
			document.getElementById('nogum').className = 'nohide';
			alert('Your browser does not seem to support getUserMedia, using a fallback video instead.');
		}

		vid.addEventListener('canplay', enablestart, false);

		function startVideo() {
			// start video
			vid.play();
			// start tracking
			ctrack.start(vid);
			// start loop to draw face
			drawLoop();
		}

		function eyesToPoint(positions, point) {
			var rEye = positions[27],
				lEye = positions[32],
				intersection;

			intersection = checkLineIntersection(
				rEye[0], rEye[1], lEye[0], lEye[1],
				point[0], point[1], point[0] - (rEye[1] - lEye[1]), point[1] + (rEye[0] - lEye[0]));

			overlayCC.beginPath();
			overlayCC.moveTo(point[0], point[1]);
			overlayCC.lineTo(intersection.x, intersection.y);
			overlayCC.stroke();

			return pointDistance(intersection.x, intersection.y, point[0], point[1]);
		}

		function drawLoop() {
			var pos = ctrack.getCurrentPosition(),
				faceHeight, rBrow, lBrow;
			window.requestAnimFrame(drawLoop);
			overlayCC.clearRect(0, 0, 640, 480);
			//psrElement.innerHTML = 'score :' + ctrack.getScore().toFixed(4);
			if (pos) {
				ctrack.draw(overlay);
				overlayCC.beginPath();
				// Twice distance to chin
				faceHeight = eyesToPoint(pos, pos[37], overlayCC) * 4;
				rBrow = eyesToPoint(pos, pos[19]) + eyesToPoint(pos, pos[20]) + eyesToPoint(pos, pos[21]) + eyesToPoint(pos, pos[22]);
				console.log('rBrow:', rBrow);
				rBrow = rBrow / 4 / faceHeight;
				console.log('rBrow:', rBrow);
				lBrow = eyesToPoint(pos, pos[18]) + eyesToPoint(pos, pos[17]) + eyesToPoint(pos, pos[16]) + eyesToPoint(pos, pos[15]);
				lBrow = lBrow / 4 / faceHeight;
				app.faces.at(0).save({
					'height': faceHeight,
					'eyebrows.right.height': rBrow,
					'eyebrows.left.height': lBrow
				});
				ractive.update();
				// console.log(faceHeight);
			}
		}

		// update stats on every iteration
		// document.addEventListener('clmtrackrIteration', function(event) {
		// 	stats.update();
		// }, false);

	})();

})();