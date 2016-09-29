require('./build/bump.js');
require('./build/css.js');
require('./build/scripts.js');

var gulp = require('gulp');

gulp.task('build', ['build:css', 'build:js']);
gulp.task('watch', ['watch:css', 'watch:js']);

gulp.task('publish', ['build', 'bump']);
gulp.task('publish:minor', ['build', 'bump:minor']);
gulp.task('publish:major', ['build', 'bump:major']);