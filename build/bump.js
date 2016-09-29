var bump = require('gulp-bump');
var filter = require('gulp-filter');
var git = require('gulp-git');
var gulp = require('gulp');
var tag_version = require('gulp-tag-version');

function inc(importance) {
    return gulp.src(['./package.json', './bower.json'])
        .pipe(bump({type: importance}))
        .pipe(gulp.dest('./'))
        .pipe(git.commit('bumps package version'))
        .pipe(filter('package.json'))
        .pipe(tag_version());
}

gulp.task('bump', function() { return inc('patch'); });
gulp.task('bump:minor', function() { return inc('minor'); });
gulp.task('bump:major', function() { return inc('major'); });