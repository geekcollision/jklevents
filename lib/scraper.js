#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var funkit = require('funkit');
var Zombie = require('zombie');

require('date-utils');

var partial = funkit.partial;

function scrape(o) {
    o = funkit.merge({
        output: 'data',
        silent: false
    }, o);
    var prefix = 'http://www.jyvaskylanseutu.fi/tapahtumat/';
    var out = o.silent? funkit.id: console.log;
    var begin = Date.today();
    var end = Date.tomorrow();

    getAmount(prefix + getLink(begin, end), function(amount) {
        var links = getLinks(begin, end, amount);

        funkit.parallel(partial(scrapePage, prefix, out), links, funkit.err(partial(writeJSON, o.output, out)));
    });
}
exports.scrape = scrape;

function getLinks(begin, end, amount) {
    // there are 20 items per each page, this generates those links
    return funkit.range(0, amount, 20).map(function(k) {
        return getLink(begin, end, k);
    });
}

function getLink(begin, end, limit) {
    limit = limit || 0;

    function formatBegin(d) {
        return '' + d.getFullYear() + funkit.zfill(2, d.getMonth() + 1) + funkit.zfill(2, d.getDate());
    }

    function formatEnd(d) {
        return '' + d.getDate() + '.' + funkit.zfill(2, d.getMonth() + 1) + '.' + funkit.zfill(2, d.getFullYear());
    }

    return 'main.php?date=' + formatBegin(begin) + '&hPvm_loppu=' + formatEnd(end) + '&rajaa=' + limit + '&hLuokka[]=0';
}

function getAmount(url, doneCb) {
    var zombie = new Zombie();

    zombie.visit(url, function(e, browser) {
        if(e) throw e;

        var td = browser.queryAll('td')[0].innerHTML;
        var parts = separate(td, 'Tulokset', '<br />').split('/');
        var c = parts[parts.length - 1].trim();

        doneCb(parseInt(c, 10));
    });
}

function scrapePage(prefix, out, url, doneCb) {
    var zombie = new Zombie();
    var target = prefix + url;

    out('Scraping ' + target + '\n');
    zombie.visit(target, function(e, browser, status) {
        if(e) throw e;

        var eventLinks = browser.queryAll('.tapahtumatiedot a').map(function(k) {
            return prefix + k.getAttribute('href');
        });

        funkit.parallel(function(k, done) {
            var zed = new Zombie();

            zed.visit(k, function(e, browser, status) {
                if(e) throw e;

                var info = browser.queryAll('.tapahtumatiedot')[0];
                info = info && info.innerHTML;

                done(null, info && {
                    name: browser.queryAll('.tapahtumaotsikko')[0].innerHTML,
                    date: parse.date(info),
                    categories: parse.categories(info),
                    location: parse.location(info),
                    address: parse.address(info),
                    description: parse.description(info),
                    pricing: parse.pricing(info),
                    additionalInformation: parse.additionalInformation(info)
                });
            });
        }, eventLinks, doneCb);
    });
}

var separate = funkit.separate;
var ltrim = funkit.ltrim;
var rtrim = funkit.rtrim;

var parse = {
    date: function(d) {
        var p = parseField(d, 'Pvm:').split(' - ');

        if(p.length == 2) {
            var b = p[0].trim().split('.');
            var e = p[1].trim().split('.');

            return {
                start: new Date(b[2], b[1], b[0]).toISOString(),
                end: new Date(e[2], e[1], e[0]).toISOString()
            };
        }

        // TODO: can there be other kind of cases?
    },
    categories: function(d) {
        // both ä and ö map to 65533 for some reason so need to manipulate
        // those a bit
        function replaceNasty(a) {
            return a.split('').map(function(v) {
                return v.charCodeAt() == 65533? '?': v;
            }).join('');
        }

        function fixes(a) {
            return {
                'n?yttelyt': 'näyttelyt',
                'ty?pajat': 'työpajat',
                'yleis?luennot': 'yleisöluennot',
                'jyv?skyl?': 'jyväskylä',
                'jyv?skyl? 175': 'jyväskylä 175'
            }[a] || a;
        }

        return rtrim('; ', parseField(d, 'Luokat: ')).split(' ; ').
            map(funkit.lower).map(replaceNasty).map(fixes);
    },
    location: function(d) {
        var p = parseField(d, 'Paikka:');

        return {
            west: separate(p, 'West=', '&amp;'),
            south: separate(p, 'South=', '&amp;'),
            east: separate(p, 'East=', '&amp;'),
            north: separate(p, 'North=', '&amp;'),
            name: separate(p, '\">', '</a>')
        };
    },
    address: function(d) {
        var p = parseField(d, 'Osoite:').split(', ');

        if(p.length > 2) p.shift();

        return {
            street: p[0],
            city: p[1]
        };
    },
    description: function(d) {
        return separate(d, '<b>Osoite:</b>', '<b>Hinnat ja liput:</b>').split('<br />').
            slice(1).filter(funkit.id).map(partial(rtrim, ' ')).map(partial(ltrim, '\n'));
    },
    pricing: function(d) {
        return separate(d, '<b>Hinnat ja liput:</b><br />', '<br /><b>Lisätietoja:</b>');
    },
    additionalInformation: function(d) {
        var p = separate(d, '<b>Lisätietoja:</b><br />').split('<br />');

        return {
            name: p[0],
            phone: ltrim('puh ', p[1]).split(' ').join(''),
            url: p[2] && separate(p[2], 'href="', '"')
        };
    }
};

function parseField(str, name) {
    return separate(str, '<b>' + name + '</b>', '<br />');
}

function writeJSON(filename, out, data) {
    var f = filename + '.json';
    data = funkit.concat(data).filter(funkit.id);

    fs.writeFile(f, JSON.stringify(data, null, 4), function(e) {
        if(e) throw e;

        out('JSON saved to ' + f);
    });
}

