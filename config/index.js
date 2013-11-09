var parseEnv = require('parse-env');

var configTemplate = require('./config.template');
var config;

try {
    config = require('./config');
}
catch(e) {}

conf = parseEnv(process.env, configTemplate, config);

conf.calendar.domain += '/calendar';

module.exports = conf;
