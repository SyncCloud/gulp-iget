var fs = require('fs'),
	gulp = require('gulp'),
	_ = require('lodash'),
    path = require('path'),
	iget = require('../lib/index')({
		project: 'synccloud-frontend',
		backend: 'http://localhost:3000'
	}),
	expect = require('chai').expect;


// monkeys are fixing cwd for gulp-mocha
// node lives in one process/scope/directory
process.chdir('./test');

describe('gulp-iget-static', function() {
    var src = './templates/*.jade';

    it('should fail on checking for incompleteness', function(done) {
		gulp.src(src)
			.pipe(iget.check())
            .on('error', function() {
                done();
            });
	});

	it('should push new strings to server', function(done) {
        gulp.src(src)
            .pipe(iget.push())
            .on('finish', function () {
                done();
            });
	});

    it('should pull strings from server to local file', function(done) {
        var localesFilePath = path.join(__dirname, 'tmp/locales.json');

        if (fs.existsSync(localesFilePath)) {
            fs.unlinkSync(localesFilePath);
        }
    	iget.pull()
            .pipe(gulp.dest('tmp'))
            .on('end', function () {
                var result = fs.readFileSync(localesFilePath, 'utf8');

                result = JSON.parse(result);
                expect(result).to.have.all.keys('ru_Отмена', 'ru_Мои', 'en_Delegated');
                done();
            });
    });
});