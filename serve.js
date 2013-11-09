#!/usr/bin/env node
var express = require('express');

var config = require('./config');
var cron = require('./lib/cron');


main();

function main() {
    var app = express();

    var apiPrefix = 'v1';

    var port = config.port;

    app.configure(function() {
        app.set('port', port);

        app.use(express.logger('dev'));

        app.use(app.router);
    });

    app.configure('development', function() {
        app.use(express.errorHandler());
    });

    app.get('/' + apiPrefix + '/events', function(req, res) {
        res.send(filterData(getData(), req.query));
    });

    cron(config, function(err) {
        if(err) console.error(err);
    });

    process.on('exit', terminator);

    ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS',
    'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGPIPE', 'SIGTERM'
    ].forEach(function(element, index, array) {
        process.on(element, function() { terminator(element); });
    });

    app.listen(port, function() {
        console.log('%s: Node (version: %s) %s started on %d ...', Date(Date.now() ), process.version, process.argv[1], port);
    });
}

function terminator(sig) {
    if(typeof sig === "string") {
        console.log('%s: Received %s - terminating Node server ...',
            Date(Date.now()), sig);

        process.exit(1);
    }

    console.log('%s: Node server stopped.', Date(Date.now()) );
}

function getData() {
    try {
        return require('./public/data');
    } catch(e) {
        console.warn('Missing API data!');
    }

    return {};
}

function filterData(data, query) {
    if(!Object.keys(query).length) return data;

    // ok if any part of query matches
    return data.filter(function(d) {
        for(var k in query) {
            if(query.hasOwnProperty(k)) {
                if(d[k] == query[k]) return true;
            }
        }
    });
}
