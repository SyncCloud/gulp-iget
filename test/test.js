var fs = require('fs'),
    gulp = require('gulp'),
    _ = require('lodash'),
    path = require('path'),
    iget = require('../lib/index')({
        project: 'synccloud-frontend',
        backend: 'http://localhost:3000'
    }),
    through = require('through2'),
    expect = require('chai').expect;


// monkeys are fixing cwd for gulp-mocha
// node lives in one process/scope/directory
process.chdir('./test');

describe('gulp-iget-static', function () {
    var src = './templates/*.jade';

    it.skip('should fail on checking for incompleteness', function (done) {
        gulp.src(src)
            .pipe(iget.check())
            .on('error', function () {
                done();
            });
    });

    it.skip('should push new strings to server', function (done) {
        gulp.src(src)
            .pipe(iget.push())
            .on('finish', function () {
                done();
            });
    });

    it.skip('should pull strings from server to local file', function (done) {
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

    describe('scan file', function () {
        it('should handle inner quotes', function (done) {
            gulp.src('./templates/scan.jade')
                .pipe(iget.scan())
                .pipe(through.obj(function (data) {
                    expect(data).to.deep.equal({
                        en: {
                            'Couldn\'t read': '',
                            'Couldn\\\'t read': '',
                            '"winter is comming"': ''
                        }
                    });
                    done();
                }))
        });
    });

    describe('iget regex', function () {
        var re = /iget[\.]?(?:\w{2})?\((.*)\)/gi,
            keyRe = /\(['"](.*)['"](?:,.*)?\)/,
            localeRe = /iget[\.]?(\w{2})/;

        var str = 'sd \niget.en(\'"winter )\'""is comming"\')\n sdfsd';

        str.match(re).forEach(function (m) {
            expect(m).to.equal('iget.en(\'"winter )\'""is comming"\')');
            expect(m.match(keyRe)[1]).to.equal('"winter )\'""is comming"');
        });

        str = "sd \n iget('отредактировал подзадачу %s', event.childTask.name)\n sdfs;\ndfsd";

        str.match(re).forEach(function (m) {
            expect(m).to.equal("iget('отредактировал подзадачу %s', event.childTask.name)");
            expect(m.match(keyRe)[1]).to.equal('отредактировал подзадачу %s');
        });
    });
});