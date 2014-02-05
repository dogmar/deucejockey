'use strict';

// TODO: figure out the best way to make gulp a dep of itself
var gulp = require('gulp'),
	autoprefixer = require('gulp-autoprefixer'),
	concat = require('gulp-concat'),
	csso = require('gulp-csso'),
	util = require('gulp-util'),
	jade = require('gulp-jade'),
	clean = require('gulp-clean'),
	filter = require('gulp-filter'),
	footer = require('gulp-footer'),
	gulpif = require('gulp-if'),
	gzip = require('gulp-gzip'),
	header = require('gulp-header'),
	jshint = require('gulp-jshint'),
	minifyHtml = require('gulp-minify-html'),
	ngHtml2js = require('gulp-ng-html2js'),
	ngmin = require('gulp-ngmin'),
	plumber = require('gulp-plumber'),
	rev = require('gulp-rev'),
	runSequence = require('run-sequence'),
	stylus = require('gulp-stylus'),
	uglify = require('gulp-uglify'),

	_ = require('underscore'),
	cp = require('child_process'),
	es = require('event-stream'),
	fs = require('fs'),
	join = require('path').join,
	lazypipe = require('lazypipe'),
	sys = require('sys');

var testFiles = 'test/*.js';
var codeFiles = ['./*.js', './lib/*.js', testFiles];
var serverProcess = null;

// Load user config and package data
var cfg = require('./gulpconfig.js');

// common variables
var concatName = cfg.pkg.name;



function readFile(filename) {
	return fs.existsSync(filename) ? fs.readFileSync(filename, {encoding: 'utf8'}) : '';
}


//---------------------------------------------
// Server preprocessing
//---------------------------------------------

var serverFiles = function() {
		return gulp.src(cfg.appFiles.jsServer);
	},
	serverBaseTasks = lazypipe()
		              .pipe(plumber)  // jshint won't render parse errors without plumber 
		              .pipe(function() {
		              	return jshint(_.extend({}, cfg.taskOptions.jshint, cfg.taskOptions.jshintServer));
		              })
		              .pipe(jshint.reporter, 'jshint-stylish'),
	serverBuildTasks = serverBaseTasks
	                   .pipe(gulp.dest, join(cfg.buildDir));

gulp.task('build-server', function() {
	return serverFiles().pipe(serverBuildTasks());
});

//---------------------------------------------
// JavaScript
//---------------------------------------------

var jsFiles = function() { 
		return gulp.src(cfg.appFiles.js);
	},
	jsBaseTasks = lazypipe()
		            .pipe(plumber)  // jshint won't render parse errors without plumber 
		            .pipe(function() {
		            	return jshint(_.extend({}, cfg.taskOptions.jshint, cfg.taskOptions.jshintBrowser));
		            })
		            .pipe(jshint.reporter, 'jshint-stylish'),
	jsBuildTasks = jsBaseTasks
		.pipe(gulp.dest, join(cfg.buildDir, cfg.jsDir)),
	tplFiles = function() { 
		return gulp.src(cfg.appFiles.tpl); 
	},
	tplBuildTasks = lazypipe()
		              .pipe(ngHtml2js, {moduleName: 'templates'})
	                .pipe(gulp.dest, join(cfg.buildDir, cfg.jsDir, cfg.templatesDir));

//noinspection FunctionWithInconsistentReturnsJS
gulp.task('build-scripts-vendor', function() {
	// if(cfg.vendorFiles.js.length) {
	// 	return gulp.src(cfg.vendorFiles.js, {base: cfg.vendorDir})
	// 				.pipe(gulp.dest(join(cfg.buildDir, cfg.jsBrowsDir, cfg.vendorDir)))
	// }
});
gulp.task('build-scripts-app', function() {
	return jsFiles().pipe(jsBuildTasks());
});
gulp.task('build-scripts-templates', function() {
	return tplFiles().pipe(tplBuildTasks());
});
gulp.task('build-scripts', ['build-scripts-vendor', 'build-scripts-app', 'build-scripts-templates']);


gulp.task('compile-scripts', function() {
	var appFiles = jsFiles()
					.pipe(jsBaseTasks())
					.pipe(concat('appFiles.js')) // not used
					.pipe(ngmin())
					.pipe(header(readFile('module.prefix')))
					.pipe(footer(readFile('module.suffix')));

	var templates = tplFiles()
					.pipe(minifyHtml({empty: true, spare: true, quotes: true}))
					.pipe(ngHtml2js({moduleName: 'templates'}))
					.pipe(concat('templates.min.js')); // not used
	
	var files = [appFiles, templates];
	if(cfg.vendorFiles.js.length) {
		files.unshift(gulp.src(cfg.vendorFiles.js));
	}
	
	return es.concat.apply(es, files)
					.pipe(concat(concatName + '.js'))
					.pipe(uglify(cfg.taskOptions.uglify))
					.pipe(rev())
					.pipe(gulp.dest(join(cfg.compileDir, cfg.jsDir)))
					.pipe(gzip())
					.pipe(gulp.dest(join(cfg.compileDir, cfg.jsDir)))
});






//---------------------------------------------
// Less / CSS Styles
//---------------------------------------------

var styleFiles = function() { 
		return gulp.src([cfg.appFiles.css, cfg.appFiles.stylus, cfg.appFiles.less]); 
	},
	styleBaseTasks = lazypipe()
		// .pipe(recess, cfg.taskOptions.recess)
		.pipe(function() {
			return gulpif('**/*.styl', stylus(cfg.taskOptions.stylus));
		})
		.pipe(function() {
			return gulpif('**/*.less', stylus(cfg.taskOptions.less));
		})
		.pipe(function() {
			return autoprefixer.apply(this, cfg.taskOptions.autoprefixer);
		}),
	buildStyles = function() {
		return styleFiles()
					.pipe(
						styleBaseTasks()
						// need to manually catch errors on stylus? :-(
						.on('error', function() {
							gutil.log(gutil.colors.red('Error')+' processing Stylus files.');
						})
					)
					.pipe(gulp.dest(join(cfg.buildDir, cfg.cssDir)))
					// .pipe(livereload(server))
	};

gulp.task('build-styles', function() {
	return buildStyles();
});
gulp.task('compile-styles', function() {
	return styleFiles()
					.pipe(styleBaseTasks())
					.pipe(rename(concatName + '.css'))
					.pipe(csso(cfg.taskOptions.csso))
					.pipe(rev())
					.pipe(gulp.dest(join(cfg.compileDir, cfg.cssDir)))
					.pipe(gzip())
					.pipe(gulp.dest(join(cfg.compileDir, cfg.cssDir)))
});


gulp.task('clean', function() {
	return gulp.src([cfg.buildDir, cfg.compileDir])
		.pipe(clean());
});

gulp.task('bower', function() {

});

gulp.task('server', function(cb) {
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


gulp.task('default', function() {
	runSequence('clean', ['build-styles', 'build-scripts', 'build-server'], 'server');
});