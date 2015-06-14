# gulp-iget
gather all iget's from files, send them to localization app, output json translations per file
```js
gulp.task('locale', function () {
    return gulp.src(['./templates/**/*.jade', './blocks/**/*.jade'])
        .pipe(iget({
          project: 'some-project',
          backend: 'http://locale-api.com'
        }))
        .pipe(jsonConcat('locales.json', function (data) {
            return new Buffer(JSON.stringify(_.values(data).reduce(function (sum, dic) {
                return _.assign(sum, dic)
            }, {}), null, 4));
        }))
        .pipe(gulp.dest('static'))
});
```
