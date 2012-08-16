#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var funkit = require('funkit');
var Zombie = require('zombie');

var urlPrefix = 'http://www.jyvaskylanseutu.fi/tapahtumat/';

main();

function main() {
    var url = urlPrefix + 'main.php';

    scrape(url, funkit.partial(writeJSON, 'data'));
}

function scrape(url, doneCb) {
    var zombie = new Zombie();
    var data = [];

    zombie.visit(url, function(e, browser, status) {
        if(e) throw e;

        browser.fill('hPvm_loppu', getDate()).
            pressButton('Hae', function(e, browser, status) {
                if(e) throw e;

                var eventLinks = browser.queryAll('.tapahtumatiedot a').map(function(k) {
                    return urlPrefix + k.getAttribute('href');
                });

                funkit.forEach(eventLinks, function(k) {
                    zombie.visit(k, function(e, browser, status) {
                        if(e) throw e;

                        var info = browser.queryAll('.tapahtumatiedot')[0].innerHTML;
                        var d = {
                            name: browser.queryAll('.tapahtumaotsikko')[0].innerHTML,
                            date: parse.date(info),
                            categories: parse.categories(info),
                            location: parse.location(info),
                            address: parse.address(info),
                            description: parse.description(info),
                            pricing: parse.pricing(info),
                            additionalInformation: parse.additionalInformation(info)
                        };

                        data.push(d);
                        console.log(d);
                    });
                });

                // TODO: next page till end

                doneCb(data);
        });
    });
}

var parse = {
    date: function(d) {
        var p = parseField(d, 'Pvm:');

        // js date -> to standard notation
        // start and end

        return p;
    },
    categories: function(d) {
        var p = parseField(d, 'Luokat: ');

        // list of categories

        return p;
    },
    location: function(d) {
        var p = parseField(d, 'Paikka:');

        // name + link

        return p;
    },
    address: function(d) {
        var p = parseField(d, 'Osoite:');

        // street, city

        return p;
    },
    description: function(d) {
        // str
    },
    pricing: function(d) {
        var p = parseField(d, 'Hinnat ja liput:'); // XXX

        // str

        return p;
    },
    additionalInformation: function(d) {
        var p = parseField(d, 'Lisätietoja:'); // XXX: encoding issue?

        // name, phone, email, url

        return p;
    }
};

function parseField(str, name) {
    return separate(str, '<b>' + name + '</b>', '<br>');
}

function separate(str, start, end) {
    var s = str.split(start)[1];

    if(!funkit.isDefined(s)) {
        console.warn('separate: Invalid start!', start);
        return;
    }

    return s.trim().split(end)[0].trim();
}

function getDate() {
    var now = new Date();

    return now.getDay() + '.' + now.getMonth() + '.' + (now.getFullYear() + 1);
}

function writeJSON(filename, data) {
    var f = filename + '.json';

    fs.writeFile(f, JSON.stringify(data, null, 4), function(e) {
        if(e) throw e;

        console.log('JSON saved to ' + f);
    });
}

