var fs = require('fs');

var CronJob = require('cron').CronJob;

var scrape = require('./scrape');
var calendar = require('./calendar');


module.exports = init;

function init(config, cb) {
    var scraperConfig = {
        output: './public/data'
    };

    scrape(scraperConfig, writeCalendar);

    if(config.cron) new CronJob(config.cron,
        scrape.bind(null, scraperConfig, cb), null, true);

    function writeCalendar(err, events) {
        if(err) return cb(err);

        var cal = calendar(config.calendar);

        cal.setDomain(config.calendar.domain);

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
}
