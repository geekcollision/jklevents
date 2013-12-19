var fs = require('fs');

var async = require('async');
var sugar = require('object-sugar');
var CronJob = require('cron').CronJob;

var scrape = require('../lib/scrape');
var calendar = require('../lib/calendar');

var Event = require('../models').Event;
var config = require('../config');


module.exports = function(cb) {
    loadData(config.calendar, cb);
};

function loadData(config, cb) {
    sugar.removeAll(Event, function(err) {
        if(err) return cb(err);

        scrape(function(err, events) {
            if(err) return cb(err);

            async.each(events, sugar.create.bind(null, Event), function(err) {
                if(err) return cb(err);

                writeCalendar(config, events, cb);
            });
        });
    });
}

function writeCalendar(config, events, cb) {
    var cal = calendar(config);

    cal.setDomain(config.domain);

    events.forEach(function(event) {
        cal.addEvent({
            start: new Date(event.date.start),
            end: new Date(event.date.end),
            summary: event.name,
            description: event.description,
            location: event.location.building + ', ' +
                event.address.street + ', ' + event.address.city
            // TODO: organizer
        });
    });

    cal.save('./public/calendar.ics', cb);
}
