'use strict';
var Backbone = require('backbone'),
	Face = require('./face-model.js');

Backbone.$ = require('jquery');
require('backbone.localstorage');


module.exports = Backbone.Collection.extend({
	model: Face,
	localStorage: new Backbone.LocalStorage('robocall')
});
