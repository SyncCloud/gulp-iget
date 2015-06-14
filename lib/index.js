var gutil = require('gulp-util'),
    _ = require('lodash'),
    $q = require('bluebird'),
    url = require('url'),
    request = $q.promisify(require('request')),
    through = require('through2');

module.exports = function (options) {
    options = _.defaults(options || {}, {
        project: null,
        backend: null,
        locales: ['ru', 'en'],
        defaultLocale: 'ru',
        translate: 'en'
    });

    return through.obj(function (file, enc, next) {
        var done = next,
            igetRe = /iget[\.]?(?:\w{2})?\(["']([^\)]+)\)/gi,
            keyRe = /\(["']([^"']+)["']/,
            localeRe = /iget[\.]?(\w{2})/,
            locales = options.locales,
            project = options.project,
            backendUrl = options.backend,
            user = process.env.USER || process.env.USERNAME,
            // Эта локаль используется в качестве ключа для записей локализации.
            // Файл локализации для этой локали собирается из атрибута Key таблицы локализации
            keyLocale = 'ru';


        var content = file.contents.toString();
        var matches = content.match(igetRe);
        var keys = (matches || []).reduce(function (sum, m) {
            try {
                var obj = {};
                var localeMatch = m.match(localeRe),
                    locale = localeMatch ? localeMatch[1] : options.defaultLocale,
                    str = m.match(keyRe)[1];
                sum[locale] = (sum[locale] || {});
                sum[locale][str]='';
                return _.assign(sum, obj);
            } catch (err) {
                console.error('cannot pull locale string from %s, check regexp', m);
                throw err;
            }
        }, {});

        pushKeys(keys).then(function (resp) {
            return pullKeys().then(function (dic) {
                file.contents = new Buffer(JSON.stringify(dic));
                file.path = file.path.replace(/(\.\w+)$/, '.iget.json');
            });
        }).done(function () {
            done(null, file)
        });

        function pushKeys (data) {
            return request({
                method: 'POST',
                url: url.resolve(backendUrl, '/api/items/'+project),
                json: true,
                auth: {
                    user: user,
                    pass: ' '
                },
                body: data
            }).get(1);
        }

        function pullKeys() {
            return request({
                url: url.resolve(backendUrl, '/api/items/' + project),
                json: true,
                auth: {
                    user: user,
                    pass: ' '
                }
            }).spread(function (resp, items) {
                var dic = {};
                items.forEach(function (item) {
                   dic[item.keyLocale + '_' +item.key] = item.translations;
                });
                return dic;
            });
        }
    });
};
