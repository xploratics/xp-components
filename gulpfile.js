require('./build/bump.js');
require('./build/css.js');
require('./build/scripts.js');

var gulp = require('gulp');

gulp.task('build', ['build:css', 'build:js']);
gulp.task('watch', ['watch:css', 'watch:js']);

gulp.task('build:publish', ['build', 'bump']);
gulp.task('build:publish:minor', ['build', 'bump:minor']);
gulp.task('build:publish:major', ['build', 'bump:major']);