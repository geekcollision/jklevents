#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var qs = require('querystring');

var async = require('async');
var ent = require('ent');
var funkit = require('funkit');
var request = require('request');
var cheerio = require('cheerio');
var osm = require('osmgeocoder');
var string = require('annostring');

require('date-utils');


module.exports = scrape;

function scrape(cb) {
    var prefix = 'http://www.jyvaskylanseutu.fi/tapahtumat/';
    var begin = Date.today();
    var end = Date.tomorrow();

    getAmount(prefix + getLink(begin, end), function(err, amount) {
        if(err) return cb(err);

        async.map(getLinks(begin, end, amount), scrapePage.bind(null, prefix), function(err, d) {
            if(err) return cb(err);

            cb(null, [].concat.apply([], d).filter(id));
        });
    });
}

function getLinks(begin, end, amount) {
    // there are 20 items per each page, this generates those links
    return funkit.range(0, amount, 20).map(function(k) {
        return getLink(begin, end, k);
    });
}

function getLink(begin, end, limit) {
    limit = limit || 0;

    function formatBegin(d) {
        return '' + d.getFullYear() + string.fill(2, '0', d.getMonth() + 1) +
            string.fill(2, '0', d.getDate());
    }

    function formatEnd(d) {
        return '' + d.getDate() + '.' + string.fill(2, '0', d.getMonth() + 1) +
            '.' + string.fill(2, '0', d.getFullYear());
    }

    return 'main.php?date=' + formatBegin(begin) + '&hPvm_loppu=' + formatEnd(end) + '&rajaa=' + limit + '&hLuokka[]=0';
}

function getAmount(url, cb) {
    request(url, function(req, res, data) {
        var $ = cheerio.load(data);
        var tdText = $($('td')[0]).html();
        var c = string.extract(tdText, 'Tulokset', '<br>').split('/')[1].trim();

        cb(null, parseInt(c, 10));
    });
}

function scrapePage(prefix, url, cb) {
    var target = prefix + url;

    request(prefix + url, function(req, res, data) {
        var $ = cheerio.load(data);

        var eventLinks = $('.tapahtumatiedot a').map(function(i, e) {
            return prefix + $(e).attr('href');
        });

        async.map(eventLinks, function(u, cb) {
            request(u, function(req, res, data) {
                var $ = cheerio.load(data);

                var info = ent.decode($($('.tapahtumatiedot')[0]).html());

                if(info) {
                    var d = {
                        name: $($('.tapahtumaotsikko')[0]).text(),
                        id: parseInt(qs.parse(u.split('?')[1]).id, 10)
                    };

                    async.each(Object.keys(parsers), function(k, cb) {
                        parsers[k](info, function(err, v) {
                            if(err) return cb(err);

                            d[k] = v;

                            cb();
                        });
                    }, function(err) {
                        if(err) return cb(err);

                        cb(null, d);
                    });
                }
                else cb();
            });
        }, cb);
    });
}

var parsers = {
    date: function(d, done) {
        var ret = {};
        var p = parseField(d, 'Pvm:').split(' - ');
        var tp = parseField(d, 'Klo:').split(' - ');

        done(null, {
            start: parseDate(p[0], time(tp[0])),
            end: parseDate(p[1] || p[0], time(tp[1]))
        });

        function parseDate(d, t) {
            var parts = d.trim().split('.');
            return new Date(parts[2], parts[1], parts[0], t.hour, t.minute, 0, 0).toISOString();
        }

        function time(t) {
            var p = t? t.split('.'): '';

            return {
                hour: p.length == 2? parseInt(p[0], 10) - 1: 0,
                minute: p.length == 2? parseInt(p[1], 10): 0
            };
        }
    },
    categories: function(d, done) {
        done(null, string.rtrim('; ', parseField(d, 'Luokat: ')).split(' ; ').map(string.lower));
    },
    location: function(d, done) {
        var address = parseAddress(d);
        var building = parseField(d, 'Paikka:');

        osm.geocode(address.street + ', ' + address.city + ', Finland', function(err, data) {
            var d = data[0] || {};

            if(building) d.building = building;

            done(null, d);
        });
    },
    address: function(d, done) {
        var p = parseAddress(d);

        done(null, p);
    },
    description: function(d, done) {
        done(null, string.extract(d, '<b>Osoite:</b>', '<b>Hinnat ja liput:</b>').split('<br>').
            slice(1).filter(id).map(string.rtrim.bind(null, ' ')).map(string.ltrim.bind(null, '\n')).join('\n'));
    },
    pricing: function(d, done) {
        done(null, string.extract(d, '<b>Hinnat ja liput:</b><br />', '<br><b>Lisätietoja:</b>'));
    },
    additionalInformation: function(d, done) {
        var p = string.extract(d, '<b>Lisätietoja:</b><br>').split('<br>');

        done(null, {
            name: p[0],
            phone: p.length > 1 && string.ltrim('puh ', p[1]).split(' ').join(''),
            url: p.length > 1 && p[2] && string.extract(p[2], 'href="', '"')
        });
    }
};

function parseAddress(d) {
    var p = parseField(d, 'Osoite:').split(', ');

    if(p.length > 2) p.shift();

    return {
        street: p[0].trim(),
        city: p[1].trim()
    };
}

function parseField(str, name) {
    return string.extract(str, '<b>' + name + '</b>', '<br>') || '';
}

function id(a) {return a;}
