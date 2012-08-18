#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var funkit = require('funkit');
var Zombie = require('zombie');

var partial = funkit.partial;

main();

function main() {
    var prefix = 'http://www.jyvaskylanseutu.fi/tapahtumat/';

    funkit.parallel(partial(scrapePage, prefix), links(), funkit.err(partial(writeJSON, 'data')));
}

function links() {
    // XXX: this might behave weirdly on April, get end in a nicer way
    var now = new Date();
    var begin = '' + now.getFullYear() + funkit.zfill(2, now.getMonth() + 1) + funkit.zfill(2, now.getDate());
    var end = '' + now.getDate() + '.' + funkit.zfill(2, now.getMonth() + 1) + '.' + funkit.zfill(2, now.getFullYear() + 1);

    // XXX: assume there cannot be more than 1000 events (better to fetch this
    // info from site)
    var maxEvents = 1000;

    return funkit.range(0, maxEvents, 20).map(function(k) {
        return 'main.php?date=' + begin + '&hPvm_loppu=' + end + '&rajaa=' + k + '&hLuokka[]=0';
    });
}

function scrapePage(prefix, url, doneCb) {
    var zombie = new Zombie();

    zombie.visit(prefix + url, function(e, browser, status) {
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
                var d = info? {
                    name: browser.queryAll('.tapahtumaotsikko')[0].innerHTML,
                    date: parse.date(info),
                    categories: parse.categories(info),
                    location: parse.location(info),
                    address: parse.address(info),
                    description: parse.description(info),
                    pricing: parse.pricing(info),
                    additionalInformation: parse.additionalInformation(info)
                }: {};

                done(null, d);
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
        return rtrim('; ', parseField(d, 'Luokat: ')).split(' ; ').map(funkit.lower);
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

        return {
            street: p[0],
            city: p[1]
        };
    },
    description: function(d) {
        return separate(d, '<b>Osoite:</b>', '<b>Hinnat ja liput:</b>').split('<br>').
            slice(1).filter(funkit.id).map(partial(rtrim, ' ')).map(partial(ltrim, '\n'));
    },
    pricing: function(d) {
        return separate(d, '<b>Hinnat ja liput:</b><br>', '<br><b>Lisätietoja:</b>');
    },
    additionalInformation: function(d) {
        var p = separate(d, '<b>Lisätietoja:</b><br>').split('<br>');

        return {
            name: p[0],
            phone: ltrim('puh ', p[1]).split(' ').join(''),
            url: p[2] && separate(p[2], 'href="', '"')
        };
    }
};

function parseField(str, name) {
    return separate(str, '<b>' + name + '</b>', '<br>');
}

function writeJSON(filename, data) {
    var f = filename + '.json';
    data = funkit.concat(data);

    fs.writeFile(f, JSON.stringify(data, null, 4), function(e) {
        if(e) throw e;

        console.log('JSON saved to ' + f);
    });
}

