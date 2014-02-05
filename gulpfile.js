'use strict';

// TODO: figure out the best way to make gulp a dep of itself
var gulp = require('gulp'),
	gutil = require('gulp-util'),
	stylus = require('gulp-stylus'),
	autoprefixer = require('gulp-autoprefixer'),
	gjade = require('gulp-jade'),
	gclean = require('gulp-clean'),
	gulpif = require('gulp-if'),
	gfilter = require('gulp-filter'),
	jshint = require('gulp-jshint'),
	// stylish = require('jshint-stylish'),
	gnodemon = require('gulp-nodemon'),
	plumber = require('gulp-plumber'),
	ngHtml2js = require('gulp-ng-html2js'),
	lazypipe = require('lazypipe'),
	runSequence = require('run-sequence'),

	join = require('path').join,
	csso = require('gulp-csso'),
	sys = require('sys'),
	cp = require('child_process'),
	_ = require('underscore');

var testFiles = 'test/*.js';
var codeFiles = ['./*.js', './lib/*.js', testFiles];
var serverProcess = null;

// Load user config and package data
var cfg = require('./gulpconfig.js');

// common variables
var concatName = cfg.pkg.name;



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
	// return gulp.src(paths.nodeapp.in)
	// 	.pipe(gfilter('!**/static/**/*'))
	// 	.pipe(gulpif('**/*.js', jshint()))
	// 	.pipe(gulp.dest(paths.nodeapp.out));
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
	runSequence('clean', ['build-styles', 'build-scripts'], 'server');
});