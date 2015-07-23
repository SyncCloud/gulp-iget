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

    var extract = require('./extract')({defaultLocale: options.defaultLocale});

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
        check: check,
        scan: scan
    };

    /**
     * Собирает ключи по файлу
     * @param file Gulp File
     * @returns {*} Хеш словарей по языкам
     * @private
     */
    function _scanFile(file) {
        try {
            return extract(file.contents.toString());
        } catch (err) {
            throw new gutil.PluginError('gulp-iget-scan', 'cannot pull locale string from "' + file.path + ' error: ' + err);
        }
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
            (file.iget || _scanFile(file) || []).forEach(function (s) {
                var splitted = s.split(/_/),
                    lang = splitted[0],
                    string = splitted[1];

                if (!data[lang]) {
                    data[lang] = {};
                }
                data[lang][string] = '';
            });
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
    function pull(options) {
        options = _.defaults(options || {}, {filename: 'locales.json'});

        var duplex = duplexify(null, null, {objectMode: true});

        client.pull().then(_formatServerItems).then(function (dic) {
            duplex.push(new gutil.File({
                path: options.filename,
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
            var igets = file.iget || _scanFile(file);

            pulled.then(function (fullDic) {
                igets.forEach(function (key) {
                    var translations = fullDic[key] || {};

                    languages.forEach(function (searchedLang) {
                        if (!translations[searchedLang]) {
                            missed.push(file.path + ': ' + searchedLang + '_`' + key.split(/_/)[1] + '`');
                        }
                    });
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

    function scan() {
        var list = [];

        return through.obj(function (file, enc, done) {
            var keys = file.iget || _scanFile(file);
            list = _.union(list, keys);
            done();
        }, function (done) {
            this.push(list);
            done();
        });
    }
};
