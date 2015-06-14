var fs = require('fs'),
	gulp = require('gulp'),
	_ = require('lodash'),
	jsonConcat = require('gulp-jsoncombine'),
	iget = require('../lib/index')({
		project: 'synccloud-frontend',
		backend: 'http://localhost:3000'
	}),
	expect = require('chai').expect;


// monkeys are fixing cwd for gulp-mocha
// node lives in one process/scope/directory
process.chdir('./test');

describe('gulp-iget-static', function() {
	it('should done', function(done) {
		var template = './templates/*.jade',
			out = gulp.dest('./tmp');

		out.on('end', function() {
			fs.readFile('./tmp/merged.json', function(err, file) {
				console.log(file.toString());
				done();
			});
		});

		gulp.src(template)
			.pipe(iget)
			.pipe(jsonConcat('merged.json', function (data) {
				return new Buffer(JSON.stringify(_.values(data).reduce(function (sum, dic) {
					return _.assign(sum, dic)
				}, {}), null, 4));
			}))
			.pipe(out);
	});

	it('should not fail on file without iget', function(done) {

	});
});