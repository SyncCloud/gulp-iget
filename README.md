# gulp-iget
Gulp commands for i18n project
# Install
```
 npm i -D git+ssh://git@github.com:SyncCloud/gulp-iget.git
```

# Commands
On a top of gulpfile.
```js
var iget = require('gulp-iget')({
    project: 'some-project',
    backend: 'http://locale-api.com'
})
```
### push
Push strings to server for future translate
```js
gulp.task('locale-push', function () {
    return gulp.src(['./templates/**/*.jade', './blocks/**/*.jade'])
        .pipe(iget.push())
});
```
### check
Check strings for completeness. Show missed strings in files and fail
@param languages {Array} - list of translation languages
```js
gulp.task('locale-check', function () {
    return gulp.src(['./templates/**/*.jade', './blocks/**/*.jade'])
        .pipe(iget.check())
});
```
### pull
Pull latest translations from server and save to a json file. Useful when you want to bundle strings with your project without need of pulling strings at application startup from a server 
```js
gulp.task('locale-pull', function () {
    return iget.pull()
        .pipe(gulp.dest('dist/static'))
});
```
