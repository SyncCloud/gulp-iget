//find iget occurences in text
'use strict';
var compact = require('lodash').compact;

module.exports = function (options) {
    /**
     * Extracts iget's from text file content(not string variable - different escaping)
     */
    return function extract(content) {
        var igetRe = /iget[\.]?(?:\w{2})?\([^\)]+\)/g,
            keyRe = /\((['"](.*)['"])(?:,.*)?\)/,
            localeRe = /iget[\.]?(\w{2})/;

        var matches = content.match(igetRe);

        var results = (matches || []).map(function (m) {
            try {
                var localeMatch = m.match(localeRe),
                    locale = localeMatch ? localeMatch[1] : options.defaultLocale,
                    keyMatch = m.match(keyRe);

                if (keyMatch) {
                    return locale + '_' + eval(keyMatch[1]);
                } else {
                    return null;
                }

            } catch (err) {
                throw new Error('failed parse ' + m + 'error: ' + err);
            }
        }, {});

        // filter empty values
        return compact(results);
    }
};

