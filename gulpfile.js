'use strict';

// TODO: figure out the best way to make gulp a dep of itself
var gulp = require('gulp'),
	amd = require('gulp-wrap-amd'),
	autoprefixer = require('gulp-autoprefixer'),
	// bowerFiles = require('gulp-bower-files'),
	browserify = require('gulp-browserify'),
	concat = require('gulp-concat'),
	csso = require('gulp-csso'),
	jade = require('gulp-jade'),
	clean = require('gulp-clean'),
	// filter = require('gulp-filter'),
	footer = require('gulp-footer'),
	_if = require('gulp-if'),
	gutil = require('gulp-util'),
	gzip = require('gulp-gzip'),
	header = require('gulp-header'),
	inject = require('gulp-inject'),
	jshint = require('gulp-jshint'),
	// livereload = require('gulp-livereload'),
	// livereloadEmbed = require('gulp-embedlr'),
	minifyHtml = require('gulp-minify-html'),
	plumber = require('gulp-plumber'),
	rename = require('gulp-rename'),
	rev = require('gulp-rev'),
	runSequence = require('run-sequence'),
	stripDebug = require('gulp-strip-debug'),
	stylus = require('gulp-stylus'),
	tap = require('gulp-tap'),
	watch = require('gulp-watch'),
	uglify = require('gulp-uglify'),

	_ = require('underscore'),
	anysort = require('anysort'),
	cp = require('child_process'),
	es = require('event-stream'),
	fs = require('fs'),
	lazypipe = require('lazypipe'),
	path = require('path'),
	pjoin = path.join;
	// sys = require('sys');

// var testFiles = 'test/*.js';
// var codeFiles = ['./*.js', './lib/*.js', testFiles];
var serverProcess = null;

// Load user Pig and package data
var cfg = require('./gulpconfig.js');

// common variables
var concatName = cfg.pkg.name;

// var embedLR = false;


function readFile(filename) {
	return fs.existsSync(filename) ? fs.readFileSync(filename, {encoding: 'utf8'}) : '';
}


//---------------------------------------------
// Server preprocessing
//---------------------------------------------

var serverFiles = function() {
	return gulp.src(cfg.appFiles.jsServer);
};
var serverBaseTasks = lazypipe()
	.pipe(plumber)
	.pipe(function() {
		return jshint(_.extend({}, cfg.taskOptions.jshint, cfg.taskOptions.jshintServer));
	})
	.pipe(jshint.reporter, 'jshint-stylish');
var serverBuildTasks = serverBaseTasks
	.pipe(gulp.dest, pjoin(cfg.buildDir));

gulp.task('build-server', function() {
	return serverFiles().pipe(serverBuildTasks());
});




//---------------------------------------------
// HTML
//---------------------------------------------

var removeStatic = function(pathName) {
	return path.relative(cfg.staticDir, pathName);
};

// used by build-html to ensure correct file order during builds
var fileSorter = (function(){
	var globList = _.flatten([
		// JS files are sorted by original vendor order, common, app, then everything else
		// cfg.vendorFiles.js.map(function(f) { 
		// 	return removeStatic(pjoin(cfg.vendorDir, path.basename(f)));
		// }),
		removeStatic(pjoin(cfg.jsDir, 'common.js')),
		removeStatic(pjoin(cfg.jsDir, 'app/models/**/*.js')),
		removeStatic(pjoin(cfg.jsDir, 'app/collections/**/*.js')),
		removeStatic(pjoin(cfg.jsDir, 'app/views/**/*.js')),
		removeStatic(pjoin(cfg.jsDir, 'routers/**/*.js')),
		removeStatic(pjoin(cfg.jsDir, 'app/**/*.js')),
		removeStatic(pjoin(cfg.jsDir, '*.js')),
	]);
	var as = anysort(globList);
	return function(a,b) {
		return as(a.filepath, b.filepath);
	};
})();

var buildHTML = function(baseDir) {
	var src = [
		pjoin(baseDir, cfg.staticDir, '**/*.*'),
		'!' + pjoin(baseDir, cfg.indexFile)
	];
	return gulp.src(src, {read: false, base:''})
		.pipe(plumber())
		.pipe(inject(pjoin(baseDir, cfg.tempDir, cfg.indexFile), {
			addRootSlash: false,
			sort: fileSorter, // see below
			ignorePath: pjoin('/', cfg.buildDir, cfg.staticDir, '/')
		}));
};

var buildHTMLTemp = function() {
	return gulp.src(cfg.appFiles.html)
		.pipe(jade(cfg.taskOptions.jade));
		// .on('error', function() {
		// 	gutil.log(gutil.colors.red('Error')+' processing Less files.');
		// });
};






gulp.task('build-html-temp', function() {
	return buildHTMLTemp()
		.pipe(gulp.dest(pjoin(cfg.buildDir, cfg.tempDir, cfg.staticDir)));
});

gulp.task('build-html', ['build-html-temp'], function() {
	// NOTE: this task does NOT depend on buildScripts and buildStyles,
	// therefore, it may incorrectly create the HTML file if called
	// directly.
	var htmlFile = readFile(pjoin(cfg.buildDir, cfg.indexFile));

	return buildHTML(cfg.buildDir)
		// .pipe(_if(embedLR, livereloadEmbed({port: cfg.server.lrPort})))
		.pipe(gulp.dest(pjoin(cfg.buildDir, cfg.staticDir)))
		.pipe(tap(function(file) {
			var newHtmlFile = file.contents.toString();
			if(newHtmlFile !== htmlFile) {
				htmlFile = newHtmlFile;
				console.log('index changed');
				// gulp.src(file.path).pipe(livereload(server));
			}
		}));
});

gulp.task('compile-html-temp', function() {
	return buildHTMLTemp()
		.pipe(gulp.dest(pjoin(cfg.compileDir, cfg.tempDir, cfg.staticDir)));
});

gulp.task('compile-html', ['compile-html-temp'], function() {
	return buildHTML(cfg.compileDir)
		.pipe(minifyHtml({empty:true,spare:true,quotes:true}))
		.pipe(gulp.dest(cfg.compileDir))
		.pipe(gzip())
		.pipe(gulp.dest(cfg.compileDir));
});







//---------------------------------------------
// JavaScript
//---------------------------------------------
var browserifyFiles = function() {
		return gulp.src(cfg.appFiles.js);
	},
	browserifyCommonFiles = function() {
		return gulp.src(cfg.appFiles.jsCommon);
	};

gulp.task('build-scripts-browserify', ['build-browserify-app', 'build-browserify-common']);

gulp.task('build-browserify-app', function() {
	return browserifyFiles()
		.pipe(browserify(cfg.taskOptions.browserify))
		.on('prebundle', function(bundle) {
			for (var i = 0; i < cfg.commonPackages.length; ++i) {
				bundle.external(cfg.commonPackages[i]);
			}
		})
		.pipe(gulp.dest(pjoin(cfg.buildDir, cfg.jsDir)));
});

gulp.task('build-browserify-common', function() {
	return browserifyCommonFiles()
		.pipe(browserify(cfg.taskOptions.browserify))
		.on('prebundle', function(bundle) {
			for (var i = 0; i < cfg.commonPackages.length; ++i) {
				bundle.require(cfg.commonPackages[i]);
			}
		})
		.pipe(gulp.dest(pjoin(cfg.buildDir, cfg.jsDir)));
});



var jsFiles = function() {
	return gulp.src(cfg.watchFiles.js);
};

var jsHintTasks = lazypipe()
	// need plumber or jshint won't render parse errors
	.pipe(plumber)
	.pipe(function() {
		return jshint(_.extend({}, cfg.taskOptions.jshint, cfg.taskOptions.jshintBrowser));
	})
	.pipe(jshint.reporter, 'jshint-stylish');
var tplFiles = function() {
	return gulp.src(cfg.appFiles.tpl);
};
var tplBuildTasks = lazypipe()
	.pipe(function() {
		return _if('**/*.jade', jade(cfg.taskOptions.jadeClient));
	})
	.pipe(amd, {deps: ['jade'], params:['jade']})
	.pipe(gulp.dest, pjoin(cfg.buildDir, cfg.jsDir, cfg.templatesDir));

gulp.task('jshint', function(){
	return jsFiles().pipe(gulp.src('./*.js')).pipe(jsHintTasks());
});

gulp.task('build-scripts-templates', function() {
	return tplFiles().pipe(tplBuildTasks());
});
gulp.task('build-scripts', ['jshint', 'build-scripts-browserify']);


gulp.task('compile-scripts', function() {
	var appFiles = jsFiles()
					// .pipe(jsBaseTasks())
					// .pipe(concat('appFiles.js')) // not used
					// .pipe(ngmin())
					.pipe(header(readFile('module.prefix')))
					.pipe(footer(readFile('module.suffix')));

	var templates = tplFiles()
					.pipe(minifyHtml({empty: true, spare: true, quotes: true}))
					// .pipe(ngHtml2js({moduleName: 'templates'}))
					.pipe(concat('templates.min.js')); // not used
	
	var files = [appFiles, templates];
	if(cfg.vendorFiles.js.length) {
		files.unshift(gulp.src(cfg.vendorFiles.js));
	}
	
	return es.concat.apply(es, files)
					.pipe(concat(concatName + '.js'))
					.pipe(stripDebug())
					.pipe(uglify(cfg.taskOptions.uglify))
					.pipe(rev())
					.pipe(gulp.dest(pjoin(cfg.compileDir, cfg.jsDir)))
					.pipe(gzip())
					.pipe(gulp.dest(pjoin(cfg.compileDir, cfg.jsDir)));
});






//---------------------------------------------
// Less / CSS Styles
//---------------------------------------------
var stylesSrc = cfg.appFiles.styles;
var styleFiles = function() {
		return gulp.src(stylesSrc);
	},
	styleBaseTasks = lazypipe()
		// .pipe(recess, cfg.taskOptions.recess)
		.pipe(function() {
			console.log(cfg.taskOptions.stylus);
			return _if('**/*.styl', stylus(cfg.taskOptions.stylus));
		})
		.pipe(function() {
			return _if('**/*.less', stylus(cfg.taskOptions.less));
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
			.pipe(gulp.dest(pjoin(cfg.buildDir, cfg.cssDir)));
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
					.pipe(gulp.dest(pjoin(cfg.compileDir, cfg.cssDir)))
					.pipe(gzip())
					.pipe(gulp.dest(pjoin(cfg.compileDir, cfg.cssDir)));
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
	serverProcess = cp.spawn('node', [pjoin(cfg.buildDir, cfg.serverEntry)], {stdio: 'inherit'});
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

gulp.task('default', ['watch']);

gulp.task('build', function(cb) {
	runSequence('clean', ['build-styles', 'build-scripts', 'build-server'], 'build-html', cb);
});

gulp.task('watch', function() {
	runSequence('build', 'server');
	watch({glob: cfg.watchFiles.js, emitOnGlob: false, name: 'JS'})
		.pipe(plumber())
		.pipe(jsHintTasks());
		// .pipe(livereload(server));
	watch({glob: cfg.watchFiles.server, emitOnGlob: false, name: 'Server'})
		.pipe(plumber())
		.pipe(serverBuildTasks());
	watch({glob: './*.js', emitOnGlob: false, name: 'Gulpfiles'})
		.pipe(plumber())
		.pipe(jsHintTasks());


	watch({glob: cfg.watchFiles.tpl, emitOnGlob: false, name: 'Templates'})
		.pipe(plumber())
		.pipe(tplBuildTasks());
	// 				.pipe(livereload(server));

	watch({glob: cfg.watchFiles.html, emitOnGlob: false, name: 'HTML'}, function() {
		runSequence('build-html');
	});
	
	watch({glob: cfg.watchFiles.styles, emitOnGlob: false, name: 'Styles'}, function() {
		// run this way to ensure that a failed pipe doesn't break the watcher.
		console.log('change');
		return buildStyles();
	});
	
	watch({glob: cfg.watchFiles.assets, emitOnGlob: false, name: 'Assets'})
		.pipe(gulp.dest(pjoin(cfg.buildDir, cfg.assetsDir)));
});
