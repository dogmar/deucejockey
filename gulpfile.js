'use strict';

// TODO: figure out the best way to make gulp a dep of itself
var gulp = require('gulp'),
	gutil = require('gulp-util'),
	gstylus = require('gulp-stylus'),
	gautoprefixer = require('gulp-autoprefixer'),
	gjade = require('gulp-jade'),
	gclean = require('gulp-clean'),
	gulpif = require('gulp-if'),
	_ = require('underscore');

var testFiles = 'test/*.js';
var codeFiles = ['./*.js', './lib/*.js', testFiles];

// Sources path
var paths = {
	static: {
		in: './src/static/',
		out: './server/static/'
	},
	node: {
		in: './src/*.{js}',
		out: './server/'
	}
};
paths = _.extend(paths, {
	styles: {
		in: paths.static.in + 'style/**/*.{css,styl}',
		out: paths.static.out + 'style/'
	},
	pages: {
		in: paths.static.in + '**/*.{html,htm,jade}',
		out: paths.static.out + ''
	},
	scripts: {
		in: paths.static.in + 'scripts/**/*.{js}',
		out: paths.static.out + 'scripts/'
	}
});


gulp.task('styles', function() {
	return gulp.src(paths.styles.in)
		.pipe(gulpif('*.styl', gstylus({use: ['nib']}))
		.pipe(gautoprefixer('last 2 version', 'ie 9'))
		.pipe(gulp.dest(paths.styles.out));
});

var pagesOutStr = gutil.combine(
	gulp.dest(paths.pages.out)
);

gulp.task('pages', function() {
	return gulp.src(paths.pages.in)
		.pipe(gulpif('*.jade', gjade()))
		.pipe(pagesOutStr());
});


gulp.task('node', function() {
	return gulp.src(paths.node.in)
		.pipe(gulp.dest('./server/'));
});

gulp.task('server', ['node'], function(cb) {
	require(paths.node.out + 'main');

	cb();
});


var coffee = require('gulp-coffee');

gulp.task('coffee', function() {
	gulp.src('./src/*.coffee')
		.pipe(coffee({bare: true}).on('error', gutil.log))
		.pipe(gulp.dest('./public/'))
});


// DEFAULT TASK
gulp.task('preprocess', ['node', 'styles', 'pages'], function(cb) {
	gulp.watch(paths.styles.in, function() {
		gulp.run('styles');
	});
	gulp.watch(paths.pages.in, function() {
		gulp.run('pages')
	});
	gulp.watch(paths.node.in);

	cb();
});

gulp.task('post', function() {
	require()
});

gulp.task('default', ['preprocess', 'server']);