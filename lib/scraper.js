#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var Zombie = require('zombie');

main();

function main() {
    var url = 'http://www.jyvaskylanseutu.fi/tapahtumat/main.php';

    writeJSON('data', scrape(url));
}

function scrape(url) {
    var zombie = new Zombie();

    zombie.visit(url, function(e, browser, status) {
        if(e) throw e;

        browser.fill('hPvm_loppu', getDate()).
            pressButton('Hae', function(e, browser, status) {
                if(e) throw e;

                // TODO: get data now
                console.log(browser.html());
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

