/*
# Welcome to the task runner that will change your life.
*/

/*
# Here we require all the node modules we need to complete our tasks.
*/
var gulp           = require('gulp'),                  // https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md
		gutil          = require('gulp-util'),             // https://www.npmjs.com/package/gulp-util
		uglify         = require('gulp-uglify'),           // https://www.npmjs.com/package/gulp-uglify
		rename         = require('gulp-rename'),           // https://www.npmjs.com/package/gulp-rename
		assign         = require('lodash.assign'),         // https://www.npmjs.com/package/lodash.assign
		eslint         = require('gulp-eslint'),           // https://www.npmjs.com/package/gulp-eslint
		phpcs          = require('gulp-phpcs'),            // https://www.npmjs.com/package/gulp-phpcs
		browserify     = require('browserify'),            // http://browserify.org/
		watchify       = require('watchify'),              // http://gulpjs.org/recipes/fast-browserify-builds-with-watchify.html
		source         = require('vinyl-source-stream'),   // https://www.npmjs.com/package/vinyl-source-stream
		buffer         = require('vinyl-buffer'),          // https://www.npmjs.com/package/vinyl-buffer
		sass           = require('gulp-sass'),             // https://www.npmjs.com/package/gulp-sass
		sourcemaps     = require('gulp-sourcemaps'),       // https://www.npmjs.com/package/gulp-sourcemaps
		postcss        = require('gulp-postcss'),          // https://www.npmjs.com/package/gulp-postcss
		browserSync    = require('browser-sync').create(), // https://www.browsersync.io/
		reload         = browserSync.reload;               // Turns reload function into variable
		path           = require('path'),                  // https://www.npmjs.com/package/path
		userpath       = path.resolve().split(path.sep),   // splits path
		svgcss         = require('gulp-svg-css'),          // https://www.npmjs.com/package/gulp-svg-to-css
		svgmin         = require('gulp-svgmin'),           // https://www.npmjs.com/package/gulp-svgmin
		svgstore       = require('gulp-svgstore'),         // https://www.npmjs.com/package/gulp-svgstore
		inject         = require('gulp-inject'),           // https://www.npmjs.com/package/gulp-inject
		del            = require('del'),                   // https://www.npmjs.com/package/del
		imagemin       = require('gulp-imagemin'),         // https://www.npmjs.com/package/gulp-imagemin
		exec           = require('child_process').exec;    // https://nodejs.org/api/child_process.html
		imageDataURI   = require('gulp-image-inline'),     // https://www.npmjs.com/package/gulp-inline-image
		concat         = require('gulp-concat'),           // https://www.npmjs.com/package/gulp-concat
		debowerify     = require('debowerify'),            // https://www.npmjs.com/package/debowerify
		changed        = require('gulp-changed'),          // https://www.npmjs.com/package/gulp-changed
		changedInPlace = require('gulp-changed-in-place'); // https://www.npmjs.com/package/gulp-changed-in-place

// Generates Port Number When First Run ( Numbers 3000 through 4000 In Increments Of 100)
var portGenerator = Math.round((Math.random()*(4000-3000)+3000)/100)*100;

/*
# Path Variables
*/
var paths = {
  imgs: {
    src: '_src/img/**/*.{png,jpg}',
    template: '_src/img/optimize/template-img/**/*.{png,jpg}',
    media: '_src/img/optimize/media-img/*',
    media_dest: '_src/img/optimize/media-img/',
    dest: 'images'
  },
  svgs: {
    src: '_src/img/svg/**/*.svg',
    dest: '_src/scss/general'
  },
  sprite: {
    src: '_src/img/sprite/**/*.{png,jpg}',
    dest: '_src/scss/general'
  },
  styles: {
    src: '_src/scss/**/*.{sass,scss}',
    dest: 'css'
  },
  scripts: {
    src: '_src/js/**/*.js',
    dest: 'js'
  }
};

// Clean Task
function clean(cb) {
  return del(['css/*', 'js/*', 'images/*']);
}

// BrowserSync Task
function serve(cb) {
  
    browserSync.init({
      open: 'external',
      host: userpath[4] + '.' + userpath[2] + '.cshp.co',
      proxy: userpath[4] + '.' + userpath[2] + '.cshp.co',
      port: portGenerator
    });
    
    watch();
    cb();
}

// Styles Task


// PostCSS Processors
var processors = [
  require('postcss-short')({ /* options */ }),
  require('postcss-sorting')({ /* options */ }),
  require('autoprefixer')({ browsers: ['last 3 versions'] })
];

var processorsProd = [
  require('postcss-short')({ /* options */ }),
  require('postcss-sorting')({ /* options */ }),
  require('autoprefixer')({ browsers: ['last 3 versions'] }),
  require('cssnano')({ /* options */ })
];

// Compile Styles for Dev
function styles() {
  return gulp.src(paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(processors))
    .pipe(sourcemaps.write('./maps', {includeContent: false, sourceRoot: '/_src/scss'}))
    .pipe(gulp.dest(paths.styles.dest))
    .pipe(browserSync.stream());
}

// Compile Styles for Production
function stylesProd() {
  return gulp.src(paths.styles.src)
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(processorsProd))
    .pipe(rename({
    	suffix: '.min'
    }))
    .pipe(gulp.dest(paths.styles.dest));
}

// Lint Task
function lint() {
  return gulp.src([paths.scripts.src, '!./node_modules'])
  	.pipe(changedInPlace({firstPass: true}))
  	.pipe(eslint())
    .pipe(eslint.format('stylish'));
}

// Scripts Task

function scripts(cb) {
  bundle();
  cb();
}

function scripts(cb) {
  bundle();
  cb();
}

// browserify options
var browserifyOpts = {
  cache: {},
  packageCache: {},
  entries: ['./_src/js/index.js'],
  paths: ['./node_modules','./_src/js/'],
  debug: true
};
var opts = assign({}, watchify.args, browserifyOpts);
var b = watchify(browserify(opts));

// Dev Build
function bundle() {
  return b.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('crate.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify().on('error', gutil.log))
    .pipe(sourcemaps.write('./maps', {includeContent: false, sourceRoot: '/_src/js'}))
    .pipe(gulp.dest('./js'));
}


// Production Build (No watching)
function scriptsProd(cb) {
    var bundleProd = browserify({
		  cache: {},
		  packageCache: {},
		  entries: ['./_src/js/index.js'],
		  paths: ['./node_modules','./_src/js/'],
		  debug: true
		})
    .transform(debowerify);
    
	return bundleProd.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('crate.min.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify().on('error', gutil.log))
    .pipe(sourcemaps.write('./maps', {includeContent: false, sourceRoot: '/_src/js'}))
    .pipe(gulp.dest('./js'));
    
    cb();
}

///////////////////
// Image/SVG tasks
///////////////////

// Optimize SVG Task
function optimizesvg() {
  return gulp.src(paths.svgs.src)
    .pipe(svgmin(function (file) {
      var prefix = path.basename(file.relative, path.extname(file.relative));
      return {
        plugins: [{
          cleanupIDs: {
            prefix: prefix + '-',
            minify: true
          }
        }]
      }
    }));
}

// SVG Style Task
function svgstyle() {
  return gulp.src(paths.svgs.src)
    .pipe(svgcss({fileName: '_icons', fileExt: 'scss', cssPrefix: 'icon-', addSize: true}))
    .pipe(gulp.dest(paths.svgs.dest));
}

// SVG Inline Task
function svginline() {
  var svgs = gulp
    .src(paths.svgs.src)
    .pipe(rename({prefix: 'icon-'}))
    .pipe(svgstore({ inlineSvg: true }));
  
  function fileContents (filePath, file) {
    return file.contents.toString();
  }
  
  return gulp
    .src('header.php')
    .pipe(inject(svgs, { transform: fileContents }))
    .pipe(gulp.dest('.'));
}

var svgcompile = gulp.series(svgstyle, styles);
var svg = gulp.series(optimizesvg, gulp.parallel(svgcompile, svginline));

// Sprite Task
function sprite() {
  return gulp.src(paths.sprite.src)
  	.pipe(imagemin())
    .pipe(imageDataURI({
      dimension: true,
      customClass: function(className, file){
        var customClass = 'icon-' + className;
        return customClass;
      }
    }))
    .pipe(concat('_sprite.scss'))
    .pipe(gulp.dest(paths.sprite.dest));
}

// Optimize Image for Template Task
function optimizetemplate() {
			
  return gulp.src(paths.imgs.template)
  	.pipe(changed(paths.imgs.dest))
  	.pipe(imagemin())
  	.pipe(gulp.dest(paths.imgs.dest));
}

// Media Uploads Task

function mediaupload(cb) {
  exec('wp media import ' + paths.imgs.media, function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
}

// Clean uploaded images
function cleanmedia(cb) {
  return del(paths.imgs.media);
}

var media = gulp.series(mediaupload, cleanmedia);

// Watch Task
function watch() {
  
  gulp.watch(paths.scripts.src, scripts);
  gulp.watch(paths.styles.src, styles);
  gulp.watch(paths.sprite.src, sprite);
  gulp.watch(paths.imgs.template, optimizetemplate);
  gulp.watch(paths.svgs.src, svg);
  gulp.watch('*.php').on('change', reload);
  var watchmedia = gulp.watch(paths.imgs.media);
	watchmedia.on('add', media);
  
}

// Export functions to declare tasks
exports.clean = clean;
exports.clean = cleanmedia;
exports.lint = lint;
exports.styles = styles;
exports.stylesProd = stylesProd;
exports.scripts = scripts;
exports.scriptsProd = scriptsProd;
exports.sprite = sprite;
exports.mediaupload = mediaupload;
exports.optimizetemplate = optimizetemplate;
exports.optimizesvg = optimizesvg;
exports.svgstyle = svgstyle;
exports.svginline = svginline;
exports.serve = serve;
exports.watch = watch;

b.transform(debowerify);
b.on('update', gulp.series(lint, bundle, reload));
b.on('log', gutil.log);

var build = gulp.series(clean, svginline, svgstyle, gulp.parallel(styles, scripts, sprite, optimizetemplate));
var dev = gulp.series(build, serve);
var prod = gulp.series(clean, svginline, svgstyle, gulp.parallel(stylesProd, scriptsProd, sprite, optimizetemplate));

// Build Task
gulp.task('build', prod);

// Default Task
gulp.task('default', dev);