var gulp = require('gulp');

var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var merge = require('utils-merge');

var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var path = require('path');

/* nicer browserify errors */
var gutil = require('gulp-util');
var chalk = require('chalk');

function build_js(options) {
    var { inputFile, watch, minify } = options;
    var args = { debug: !minify };

    if (watch)
        args = merge(watchify.args, args);

    var b = browserify(inputFile, args);

    if (options.watch)
        b = watchify(b, args);

    var b = b.transform(babelify, { /* opts */ });

    bundle_js(b, options);

    b.on('update', function () {
        bundle_js(b, options);
    });
}

function bundle_js(b, options) {
    var { inputFile, outputFile, minify } = options;

    var outputPath = path.dirname(outputFile);
    outputFile = path.basename(outputFile);
    console.log(outputFile);

    b = b.bundle();
    b = b.on('error', map_error);
    b = b.pipe(source(inputFile));
    b = b.pipe(buffer());
    // b = b.pipe(gulp.dest(outputPath));
    b = b.pipe(rename(outputFile));

    if (minify) {
        b = b.pipe(sourcemaps.init({ loadMaps: true }));
        b = b.pipe(uglify());
        b = b.pipe(sourcemaps.write('.'));
    }

    b = b.pipe(gulp.dest(outputPath));

    return b;
}

function map_error(err) {
    if (err.fileName) {
        // regular error
        gutil.log(chalk.red(err.name)
            + ': '
            + chalk.yellow(err.fileName.replace(__dirname + '/src/js/', ''))
            + ': '
            + 'Line '
            + chalk.magenta(err.lineNumber)
            + ' & '
            + 'Column '
            + chalk.magenta(err.columnNumber || err.column)
            + ': '
            + chalk.blue(err.description));
    } else {
        // browserify error..
        gutil.log(chalk.red(err.name)
            + ': '
            + chalk.yellow(err.message));
    }

    this.emit('end');
}

gulp.task('watch', function () {
    return build_js({
        inputFile: './src/lib.js',
        outputFile: './dist/lib.js',
        watch: true
    });
});

gulp.task('build', function () {
    build_js({
        inputFile: './src/lib.js',
        outputFile: './dist/lib.js',
    });

    build_js({
        inputFile: './src/lib.js',
        outputFile: './dist/lib.min.js',
        minify: true
    });
});