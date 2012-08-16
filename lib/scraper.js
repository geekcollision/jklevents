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

    zombie.visit(url, function(e, browser, status) {
        if(e) throw e;

        browser.fill('hPvm_loppu', getDate()).
            pressButton('Hae', function(e, browser, status) {
                if(e) throw e;

                var eventLinks = browser.queryAll('.tapahtumatiedot a').map(function(k, i) {
                    return urlPrefix + k.getAttribute('href');
                });

                console.log(eventLinks);
                doneCb(eventLinks);
        });
    });
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

