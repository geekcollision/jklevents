var cal = require('ical-generator')();


module.exports = init;

function init(config) {
    cal.setDomain(config.domain);

    return cal;
}