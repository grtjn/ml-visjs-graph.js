/*jshint node: true */

'use strict';

var projectName = 'ml-visjs-graph.js';
var moduleName = 'mlvisjs';

var gulp = require('gulp'),
    concat = require('gulp-concat'),
    html2string = require('gulp-html2string'),
    less = require('gulp-less'),
    jshint = require('gulp-jshint'),
    karma = require('karma').server,
    minifyHtml = require('gulp-htmlmin'),
    path = require('path'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    minifyCss = require('gulp-cssnano'),
    sourcemaps = require('gulp-sourcemaps'),
    info = require('gulp-print').default,
    rm = require('gulp-rm'),
cp = require('child_process');

gulp.task('jshint', function() {
  return gulp.src([
      './gulpfile.js',
      './src/**/*.js'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('templates', gulp.series('jshint', function() {
  return gulp.src([
      './src/**/*.html'
    ])
    .pipe(info(function(filepath) {
      return 'processing: ' + filepath;
    }))
    .pipe(minifyHtml({
      empty: true,
      spare: true,
      quotes: true
    }))
    .pipe(html2string({
      base: path.join(__dirname, 'src'),
      createObj: true,
      objName: moduleName + 'Tpls',
      quoteChar: '\''
    }))
    .pipe(concat(projectName+'.templates.js'))
    .pipe(gulp.dest('build'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))
  ;
}));

gulp.task('scripts', gulp.series('templates', function() {
  return gulp.src([
      './build/**/*.templates.js',
      './src/**/*.global.js',
      './src/**/*.module.js'
    ])
    .pipe(info(function(filepath) {
      return 'processing: ' + filepath;
    }))
    .pipe(concat(projectName+'.js'))
    .pipe(gulp.dest('dist'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))

    .pipe(rename(projectName+'.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))
  ;
}));

gulp.task('styles', gulp.series('scripts', function() {
  return gulp.src([
      './less/**/*.less'
    ])
    .pipe(info(function(filepath) {
      return 'processing: ' + filepath;
    }))
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(concat(projectName+'.css'))
    .pipe(gulp.dest('dist'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))

    .pipe(rename(projectName+'.min.css'))
    .pipe(minifyCss())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))
  ;
}));

gulp.task('copy-dist', gulp.series('styles', function() {
  return gulp.src([
      './dist/**/*.*'
    ])
    .pipe(gulp.dest('docs/dist/'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))
  ;
}));

gulp.task('test', function() {
  karma.start({
    configFile: path.join(__dirname, './karma.conf.js'),
    singleRun: true,
    autoWatch: false
  }, function (exitCode) {
    console.log('Karma has exited with ' + exitCode);
    process.exit(exitCode);
  });
});

gulp.task('autotest', function(done) {
  karma.start({
    configFile: path.join(__dirname, './karma.conf.js'),
    autoWatch: true
  }, function (exitCode) {
    console.log('Karma has exited with ' + exitCode);
    //process.exit(exitCode);
  });
  done();
});

gulp.task('clean-docs', function() {
  return gulp.src('./docs/api/**/*', { read: false })
  .pipe(rm({async: false}));
});

gulp.task('docs', gulp.series('clean-docs', function(done) {
  cp.exec('./node_modules/.bin/jsdoc -c jsdoc.conf.json', function(err) {
    if (err) {
      return console.log(err);
    }
  });
  done();
}));

gulp.task('default', gulp.series('copy-dist', 'docs', function(done) { done(); }));
