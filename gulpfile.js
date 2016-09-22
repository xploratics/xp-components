require('./build/css.js');
require('./build/scripts.js');

var gulp = require('gulp');

gulp.task('build', ['build:css', 'build:js']);
gulp.task('watch', ['watch:css', 'watch:js']);