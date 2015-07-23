//find iget occurences in text
'use strict';

module.exports = function (options) {
    return function extract(content) {
        var igetRe = /iget[\.]?(?:\w{2})?\([^\)]+\)/g,
            keyRe = /\(['"](.*)['"](?:,.*)?\)/,
            localeRe = /iget[\.]?(\w{2})/;

        var matches = content.match(igetRe);

        return (matches || []).map(function (m) {
            try {
                var localeMatch = m.match(localeRe),
                    locale = localeMatch ? localeMatch[1] : options.defaultLocale,
                    str = m.match(keyRe)[1];

                return locale + '_' + str;
            } catch (err) {
                throw new Error('failed parse ' + m);
            }
        }, {});
    }
};

