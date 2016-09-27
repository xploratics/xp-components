var cleanCss = require('gulp-clean-css');
var gulp = require('gulp');
var path = require('path');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');

function build_css(options) {
    var { minify, outputFile } = options;

    var outputPath = path.dirname(outputFile);
    outputFile = path.basename(outputFile);
    
    var b = gulp.src('./src/css/index.scss');

    if (!options.minify)
        b = b.pipe(sourcemaps.init({ loadMaps: true }));

    b = b.pipe(sass().on('error', sass.logError));
    b = b.pipe(rename(outputFile));

    if (options.minify)
        b = b.pipe(cleanCss({ /* options */ }))
    else
        b = b.pipe(sourcemaps.write('.'));

    b = b.pipe(gulp.dest(outputPath));
    return b;
}

gulp.task('build:css', ['build:css+maps'], function () {
    return build_css({
        minify: true,
        outputFile: './dist/xp-components.min.css'
    });
});

gulp.task('build:css+maps', function () {
    return build_css({
        minify: false,
        outputFile: './dist/xp-components.css'
    });
});

gulp.task('watch:css', ['build:css+maps'], function () {
    return gulp.watch('./src/css/**/*.scss', ['build:css+maps']);
});