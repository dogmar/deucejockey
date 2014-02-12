'use strict';
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
	defaults: {
		height: 1,
		eyebrows: {
			left: {
				height: 0.5,
				angle: 0
			},
			right: {
				height: 0.5,
				angle: 0
			}
		},
		mouth: {
			openHeight: 0
		}
	},

	closeMouth: function () {
		this.save({
			'mouth.openHeight': 0
		});
	}
});