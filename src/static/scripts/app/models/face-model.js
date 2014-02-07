/*global Backbone */
var app = app || {};

(function () {
	'use strict';

	// Todo Model
	// ----------

	// Our basic **Todo** model has `title`, `order`, and `completed` attributes.
	app.Face = Backbone.Model.extend({
		// Default attributes for the todo
		// and ensure that each todo created has `title` and `completed` keys.
		defaults: {
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
})();
