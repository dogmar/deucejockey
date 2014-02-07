/*global $ */
/*jshint unused:false */
var app = app || {};
var ENTER_KEY = 13;
var ESC_KEY = 27;

$(function () {
	'use strict';

	// kick things off by creating the `App`
	// Create our global collection of **Todos**.
	app.faces = new Faces();
	new app.AppView();
});
