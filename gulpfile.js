'use strict';

// TODO: figure out the best way to make gulp a dep of itself
var gulp = require('gulp'),
	gutil = require('gulp-util'),
	gstylus = require('gulp-stylus'),
	gautoprefixer = require('gulp-autoprefixer'),
	gjade = require('gulp-jade'),
	gclean = require('gulp-clean'),
	gulpif = require('gulp-if'),
	gfilter = require('gulp-filter'),
	gjshint = require('gulp-jshint'),
	gnodemon = require('gulp-nodemon'),
	sys = require('sys'),
	cp = require('child_process'),
	_ = require('underscore');

var testFiles = 'test/*.js';
var codeFiles = ['./*.js', './lib/*.js', testFiles];
var serverProcess = null;

// Sources path
var paths = {
	static: {
		in: './src/static/',
		out: './built/static/'
	},
	nodeapp: {
		in: './src/**/*',
		out: './built/'
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
		.pipe(gulpif('**/*.styl', gstylus({use: ['nib']})))
		.pipe(gautoprefixer('last 2 version', 'ie 9'))
		.pipe(gulp.dest(paths.styles.out));
});

gulp.task('pages', function() {
	return gulp.src(paths.pages.in)
		.pipe(gulpif('**/*.jade', gjade()))
		.pipe(gulp.dest(paths.pages.out));
});

gulp.task('clean', function() {
	return gulp.src(paths.nodeapp.out + '*')
		.pipe(gclean());
});

gulp.task('nodeapp', function() {
	return gulp.src(paths.nodeapp.in)
		.pipe(gfilter('!**/static/**/*'))
		.pipe(gjshint())
		.pipe(gulp.dest(paths.nodeapp.out));
});

gulp.task('server', ['preprocess'], function(cb) {
	// gnodemon({ 
	// 	script: './built/main.js'
	// 	// options: '-e html,js -i ignored.js'
	// });
	console.log('server');
	if (serverProcess) {
		console.log('killkillkill!');
		serverProcess.removeListener('exit', onExit);
		serverProcess.kill();
	}
	serverProcess = cp.spawn('node', ['./built/main.js'], {stdio: 'inherit'});
	serverProcess.addListener('exit', onExit);
	cb();
});

function onExit(e) {
	console.log('exit – code:', e.code, 'signal:', e.signal);
	process.exit();
}

gulp.task('preprocess', ['nodeapp', 'styles', 'pages'], function(cb) {
	gulp.watch(paths.styles.in, function() {
		gulp.run('styles');
	});
	gulp.watch(paths.pages.in, function() {
		gulp.run('pages');
	});
	gulp.watch(paths.nodeapp.in, function() {
		gulp.run('server');
	});

	cb();
});


gulp.task('default', ['clean'], function() {
	gulp.run('preprocess');
	console.log('about to start server');
	gulp.run('server');
});