var babelify = require('babelify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var chalk = require('chalk');
var gulp = require('gulp');
var gutil = require('gulp-util');
var merge = require('utils-merge');
var path = require('path');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var watchify = require('watchify');

function build_js(options) {
    var { inputFile, watch, minify } = options;
    var args = { debug: !minify };

    if (watch)
        args = merge(watchify.args, args);

    var b = browserify(inputFile, args);

    if (options.watch)
        b = watchify(b, args);

    var b = b.transform(babelify, { presets: ["es2015"] });

    bundle_js(b, options);

    b.on('update', function () {
        bundle_js(b, options);
    });
}

function bundle_js(b, options) {
    var { inputFile, outputFile, minify } = options;

    var outputPath = path.dirname(outputFile);
    outputFile = path.basename(outputFile);

    gutil.log(outputFile);

    b = b.bundle();
    b = b.on('error', map_error);
    b = b.pipe(source(inputFile));
    b = b.pipe(buffer());

    if (minify) {
        b = b.pipe(uglify());
        b = b.on('error', map_error);
    }

    b = b.pipe(rename(outputFile));
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
            + chalk.magenta(err.lineNumber || err.line)
            + ' & '
            + 'Column '
            + chalk.magenta(err.columnNumber || err.column)
            + ': '
            + chalk.blue(err.description || err.cause || err.message || err.msg));
    } else {
        // browserify error..
        gutil.log(chalk.red(err.name)
            + ': '
            + chalk.yellow(err.message));
    }

    this.emit('end');
};

gulp.task('watch:js', function () {
    return build_js({
        inputFile: './src/lib.js',
        outputFile: './dist/xp-component.js',
        watch: true
    });
});

gulp.task('build:js', function () {
    build_js({
        inputFile: './src/lib.js',
        outputFile: './dist/xp-component.js',
    });

    build_js({
        inputFile: './src/lib.js',
        outputFile: './dist/xp-component.min.js',
        minify: true
    });
});