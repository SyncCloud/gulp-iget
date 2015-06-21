var gutil = require('gulp-util'),
    _ = require('lodash'),
    duplexify = require('duplexify'),
    api = require('iget/dist/api'),
    StringStream = require('string-stream'),
    through = require('through2');

module.exports = function (options) {
    options = _.defaults(options || {}, {
        project: null,
        backend: null,
        locales: ['ru', 'en'],
        defaultLocale: 'ru',
        translate: 'en'
    });

    if (!options.project || !options.backend) {
        throw new gutil.PluginError('gulp-iget', '`backend` and `project` options must be defined');
    }

    var user = process.env.USER || process.env.USERNAME,
        client = api({
            auth: user,
            url: options.backend,
            project: options.project
        });

    return {
        pull: pull,
        push: push,
        check: check
    };

    /**
     * Собирает ключи по файлу
     * @param file Gulp File
     * @returns {*} Хеш словарей по языкам
     * @private
     */
    function _scanFile(file) {
        var igetRe = /iget[\.]?(?:\w{2})?\(["']([^\)]+)\)/gi,
            keyRe = /\(["']([^"']+)["']/,
            localeRe = /iget[\.]?(\w{2})/;

        var content = file.contents.toString();
        var matches = content.match(igetRe);
        return (matches || []).reduce(function (sum, m) {
            try {
                var obj = {};
                var localeMatch = m.match(localeRe),
                    locale = localeMatch ? localeMatch[1] : options.defaultLocale,
                    str = m.match(keyRe)[1];
                sum[locale] = (sum[locale] || {});
                sum[locale][str] = '';
                return _.assign(sum, obj);
            } catch (err) {
                throw new gutil.PluginError('gulp-iget-scan', 'cannot pull locale string from %s, check regexp ' + m + ' error: ' + err);
            }
        }, {});
    }

    /**
     * Преобразует серверные айтемы в единый словарь для перевода
     * @param items
     * @returns {{}}
     * @private
     */
    function _formatServerItems(items) {
        var dic = {};

        items.forEach(function (item) {
            dic[item.keyLocale + '_' + item.key] = item.translations;
        });
        return dic;
    }

    /**
     * Отправляет на сервер найденые в файлах ключи
     */
    function push() {
        var data = {};

        return through.obj(function (file, enc, done) {
            _.merge(data, file.iget || _scanFile(file));
            done(null, file);
        }, function (done) {
            client.push(data).then(function (resp) {
                console.log(resp);
                done();
            }.bind(this), done);
        });
    }

    /**
     * Собирает строки перевода с сервера в файл
     * @returns {*}
     */
    function pull() {
        var duplex = duplexify(null, null, {objectMode: true});

        client.pull().then(_formatServerItems).then(function (dic) {
            duplex.push(new gutil.File({
                path: 'locales.json',
                contents: new StringStream(JSON.stringify(dic, null, 4))
            }));
            duplex.push(null);
        });

        return duplex;
    }

    /**
     * Проверяет целостность перевода
     * @param languages
     */
    function check(languages) {
        var pulled = client.pull().then(_formatServerItems),
            missed = [];

        if (!languages) {
            languages = options.locales;
        } else if (!_.isArray(languages)) {
            throw new gutil.PluginError('gulp-iget:check', '`languages` should be array');
        }

        return through.obj(function (file, enc, done) {
            var keys = file.iget || _scanFile(file);

            pulled.then(function (fullDic) {
                _.pairs(keys).forEach(function (pair) {
                    var lang = pair[0],
                        dic = pair[1];

                    _.pairs(dic).forEach(function (pair) {
                        var key = pair[0],
                            translations = fullDic[lang + '_' + key] || {};

                        languages.forEach(function (searchedLang) {
                            if (!translations[searchedLang]) {
                                missed.push(file.path + ': ' + searchedLang + '_`' + key + '`');
                            }
                        });
                    })
                });
                done();
            });
        }, function (done) {
            if (missed.length) {
                done(new gutil.PluginError('gulp-iget:check', 'failed due to incomplete translation'));
                missed.forEach(function (str) {
                    console.log(str);
                });
            } else {
                done();
            }
        });
    }

};
