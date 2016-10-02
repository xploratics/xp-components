require('./build/bump.js');
require('./build/css.js');
require('./build/scripts.js');

var gulp = require('gulp');
var run_sequence = require('run-sequence');

gulp.task('build', ['build:css', 'build:js']);
gulp.task('watch', ['watch:css', 'watch:js']);

gulp.task('publish', callback => run_sequence('build', 'bump', callback));
gulp.task('publish:minor', callback => run_sequence('build', 'bump:minor', callback));
gulp.task('publish:major', callback => run_sequence('build', 'bump:major', callback));