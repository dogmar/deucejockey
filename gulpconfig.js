/**
 * This file/module contains all configuration for the build process.
 */

var join = require('path').join,
	bowerrc = JSON.parse(require('fs').readFileSync('./.bowerrc', {encoding: 'utf8'})),
	bower = require(bowerrc.json.replace(/^\.?\/?/, './')),
	pkg = require('./package.json'),
	buildDir = 'built',
	compileDir = 'compiled',
	srcDir = 'src',
	staticDir = 'static',
	templatesDir = 'templates',
	indexFile = join(staticDir,'index.html'),
	jsDir = join(staticDir,'scripts'),
	vendorDir = join(jsDir, 'lib'),
	cssDir = join(staticDir,'style'),
	assetsDir = join(staticDir,'assets'),
	// htmlDir = join(staticDir,''),
	serverEntry = 'main.js',
	tempDir = 'tmp';

module.exports = {
	srcDir: srcDir,
	buildDir: buildDir,
	compileDir: compileDir,
	serverEntry: serverEntry,
	
	// Relative paths to core files and folders for input and output
	indexFile: indexFile,
	jsDir: jsDir,
	cssDir: cssDir,
	assetsDir: assetsDir,
	vendorDir: vendorDir,
	templatesDir: templatesDir,
	tempDir: tempDir,
	staticDir: staticDir,
	
	// allows settings reuse from package.json and bower.json
	bower: bower,
	pkg: pkg,

	/**
	 * Settings for the server task
	 * When run, this task will start a connect server on
	 * your build directory, great for livereload
	 */
	server: {
		port: 8081, // 0 = random port
		host: null, // null/falsy means listen to all, but will auto open localhost
		
		// Enable disable default auto open
		// false: run with --open to open
		// true: run with --no-open to not open, recommended if port is 0
		openByDefault: false,
		
		// set to false to prevent request logging
		// set to any non-`true` value to configure the logger
		log: true
	},
	
	taskOptions: {
		autoprefixer: ['last 2 version', 'ie 9'],
		browserify: {
			'debug': true,
			shim: {
				'clm': {
					path: 'node_modules/clmtrackr/clmtrackr-dev/clmtrackr.min.js',
					exports: 'clm'
				},
				'pmodel': {
					path: 'node_modules/clmtrackr/clmtrackr-dev/models/model_pca_20_svm.js',
					exports: 'pModel'
				}
			}
		},
		csso: false, // set to true to prevent structural modifications
		jade: {
			pretty: true
		},
		jadeClient: {
			client: true,
			// locals: {myLocal:'this is custom stuff'},
			// compileDebug: true,
			// namespace: 'app.templates'
		},
		jshint: {
			'bitwise': true,
			'devel': true,
			'camelcase': true,
			'curly': true,
			'eqeqeq': true,
			'eqnull': true,
			'forin': true,
			'immed': true,
			'indent': 2,
			// 'jquery': true,
			'latedef': 'nofunc',
			'newcap': true,
			'noarg': true,
			'quotmark': 'single',
			'smarttabs': true,
			'trailing': true,
			'undef': true,
			'unused': true
		},
		jshintServer: {
			'node': true,
		},
		jshintBrowser: {
			// 'es3': true,
			'browser': true,
			'node': true
		},
		less: {},
		stylus: {
			'include-css': true,
			'include css': true,
			'includeCss': true,
			'includecss': true,
			'includeCSS': true,
			use: ['nib']
		},
		recess: {
			strictPropertyOrder: false,
			noOverqualifying: false,
			noUniversalSelectors: false
		},
		uglify: {}
	},
	
	/**
	 * This is a collection of file patterns that refer to our app code (the
	 * stuff in `src/`). These file paths are used in the configuration of
	 * build tasks. `js` is all project javascript, less tests. `ctpl` contains
	 * our reusable components' (`src/common`) template HTML files, while
	 * `atpl` contains the same, but for our app's code. `html` is just our
	 * main HTML file, `less` is our main stylesheet, and `unit` contains our
	 * app's unit tests.
	 */
	appFiles: {
		jsServer: [
			join(srcDir, '**/*.js'),
			'!'+join(srcDir,'/**/*.spec.js'),
			'!'+join(srcDir, staticDir, '**/*'),
			'!'+join(bowerrc.directory, '**/*')
		],
		js: [
			join(srcDir, jsDir, '*.js'),
			'!' + join(srcDir, jsDir, 'common.js')
			// '!'+join(srcDir, vendorDir, '**/*'),
			// '!'+join(srcDir, jsDir, 'app.js')
		],
		jsCommon: [
			join(srcDir, jsDir, 'common.js')
		],
		jsunit: [
			join(buildDir, '/**/*.js'),
			srcDir+'/**/*.spec.js',
			'!'+join(buildDir, assetsDir, '**/*.js'),
			'!'+join(buildDir, vendorDir, '**/*.js')
		],
		tpl: [
			join(srcDir, templatesDir, '**/*.*'),
		],
		html: join(srcDir, staticDir, 'index.jade'),
		styles: [
			join(srcDir, cssDir, '**/*.css'),
			join(srcDir, cssDir, '**/*.styl'),
			join(srcDir, cssDir, '**/*.less'),
			join('!' + srcDir, cssDir, 'includes/**/*')
		],
		assets: join(srcDir, assetsDir, '**/*.*')
	},
	
	/**
	 * Similar to above, except this is the pattern of files to watch
	 * for live build and reloading.
	 */
	watchFiles: {
		server: [
			join(srcDir, '*')
		],
		js: [
			join(srcDir, jsDir, '**/*.js')
		],
		//jsunit: [ srcDir+'/**/*.spec.js' ], // watch is handled by the karma plugin!
		tpl: [
			join(srcDir, templatesDir, '**/*.*'),
		],
		html: [
			join(srcDir, staticDir, 'index.jade')
		],
		styles: [
			join(srcDir, cssDir, '**/*.{styl,css,less}')
		],
		assets: join('src',assetsDir,'**/*.*')
	},

	/**
	 * This is a collection of files used during testing only.
	 */
	testFiles: {
		config: 'karma/karma.conf.js',
		js: [
			'vendor/angular-mocks/angular-mocks.js'
		]
	},

	/**
	 * This is the same as `app_files`, except it contains patterns that
	 * reference vendor code (`vendor/`) that we need to place into the build
	 * process somewhere. While the `app_files` property ensures all
	 * standardized files are collected for compilation, it is the user's job
	 * to ensure non-standardized (i.e. vendor-related) files are handled
	 * appropriately in `vendorFiles.js`.
	 *
	 * The `vendorFiles.js` property holds files to be automatically
	 * concatenated and minified with our project source files.
	 *
	 * The `vendorFiles.assets` property holds any assets to be copied along
	 * with our app's assets. This structure is flattened, so it is not
	 * recommended that you use wildcards.
	 */
	commonPackages: [
		'jquery',
		'underscore',
		'backbone'
	],
};