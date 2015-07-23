var fs = require('fs'),
    gulp = require('gulp'),
    _ = require('lodash'),
    path = require('path'),
    iget = require('../lib/index')({
        project: 'iget-tests',
        backend: 'http://localhost:3000'
    }),
    through = require('through2'),
    expect = require('chai').expect;


// monkeys are fixing cwd for gulp-mocha
// node lives in one process/scope/directory
process.chdir('./test');

describe('gulp-iget-static', function () {
    var src = './templates/*.jade';

    it('should fail on checking for incompleteness', function (done) {
        gulp.src(src)
            .pipe(iget.check())
            .on('error', function () {
                done();
            });
    });

    it('should push new strings to server', function (done) {
        gulp.src(src)
            .pipe(iget.push())
            .on('finish', function () {
                done();
            });
    });

    it('should pull strings from server to local file', function (done) {
        var localesFilePath = path.join(__dirname, 'tmp/locales.json');

        if (fs.existsSync(localesFilePath)) {
            fs.unlinkSync(localesFilePath);
        }
        iget.pull()
            .pipe(gulp.dest('tmp'))
            .on('end', function () {
                var result = fs.readFileSync(localesFilePath, 'utf8');

                result = JSON.parse(result);
                expect(result).to.have.any.keys('ru_Отмена', 'ru_Мои', 'en_Delegated', "en_Couldn't read", "en_Couldn\\'t read", "en_\"winter is comming\"");
                done();
            });
    });

    describe('scan file', function () {
        it('should handle inner quotes', function (done) {
            gulp.src('./templates/scan.jade')
                .pipe(iget.scan())
                .pipe(through.obj(function (data) {
                    expect(data).to.have.members([
                        'en_Couldn\'t read',
                        'en_Couldn\\\'t read',
                        'en_"winter is comming"'
                    ]);
                    done();
                }))
        });
    });

    describe('iget regex', function () {
        var extract = require('../lib/extract')({defaultLocale: 'ru'}),
            str;

        str = extract('sd \niget.en(\'"winter \'""is comming"\')\n sdfsd')[0];
        expect(str).to.equal('en_"winter \'""is comming"');

        str = extract("sd \n iget('отредактировал подзадачу %s', event.childTask.name)('sdfsd')(href='http://google.com')\n sdfs;\ndfsd")[0];
        expect(str).to.equal('ru_отредактировал подзадачу %s');

    });
});