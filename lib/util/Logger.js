var winston = require('winston');

var logger = {
    debug   : winston.debug,
    info    : winston.info,
    warn    : winston.warn,
    error   : winston.error
}

module.exports = logger