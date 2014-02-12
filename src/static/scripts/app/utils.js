// helper functions

/**
 * Provides requestAnimationFrame in a cross browser way.
 */
window.requestAnimFrame = (function() {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
			return window.setTimeout(callback, 1000 / 60);
		};
})();

/**
 * Provides cancelRequestAnimationFrame in a cross browser way.
 */
window.cancelRequestAnimFrame = (function() {
	return window.cancelCancelRequestAnimationFrame ||
		window.webkitCancelRequestAnimationFrame ||
		window.mozCancelRequestAnimationFrame ||
		window.oCancelRequestAnimationFrame ||
		window.msCancelRequestAnimationFrame ||
		window.clearTimeout;
})();

// video support utility functions
module.exports.supportsVideo = function() {
	return !!document.createElement('video').canPlayType;
};

module.exports.supportsH264BaselineVideo = function() {
	if (!module.exports.supportsVideo()) {
		return false;
	}
	var v = document.createElement('video');
	return v.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
};

module.exports.supportsOggTheoraVideo = function() {
	if (!module.exports.supportsVideo()) {
		return false;
	}
	var v = document.createElement('video');
	return v.canPlayType('video/ogg; codecs="theora, vorbis"');
};