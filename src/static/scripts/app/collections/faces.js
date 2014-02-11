/*global Backbone */
var app = app || {};

(function () {
	'use strict';

	app.Faces = Backbone.Collection.extend({
		model: app.Face,
		localStorage: new Backbone.LocalStorage('robocall')
	});
})();
