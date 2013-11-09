var fs = require('fs');

var CronJob = require('cron').CronJob;

var scrape = require('./scrape');


module.exports = init;

function init(config, cb) {
    var scraperConfig = {
        output: './public/data'
    };

    scrape(scraperConfig, cb);

    if(config.cron) new CronJob(config.cron,
        scrape.bind(null, scraperConfig, cb), null, true);
}
