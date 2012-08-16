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
        // js date -> to standard notation
    },
    categories: function(d) {
        // list of categories
    },
    location: function(d) {
        // name + link
    },
    address: function(d) {
        // street, city
    },
    description: function(d) {
        // str
    },
    pricing: function(d) {
        // str
    },
    additionalInformation: function(d) {
        // name, phone, email, url
    }
};

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

