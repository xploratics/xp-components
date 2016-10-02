var bump = require('gulp-bump');
var filter = require('gulp-filter');
var git = require('gulp-git');
var gulp = require('gulp');
var merge_stream = require('merge-stream');
var tag_version = require('gulp-tag-version');

function inc(importance) {
    var packages = gulp.src(['./package.json', './bower.json'])
        .pipe(bump({type: importance}))
        .pipe(gulp.dest('./'));

    var outputs = gulp.src(['./dist/**/*.*']);

    return merge_stream(packages, outputs)
        .pipe(git.commit('bumps package version'))
        .pipe(filter('package.json'))
        .pipe(tag_version());
}

gulp.task('bump', function() { return inc('patch'); });
gulp.task('bump:minor', function() { return inc('minor'); });
gulp.task('bump:major', function() { return inc('major'); });