var async = require('async');
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var request = require('request');
var SocketClient = require('socket.io-client');
var util = require('util');
var ConfigurationCache = require('./configuration-cache');

var version = require('../package.json').version;

function ConfigurationClient(options) {
    this.host = options.host;
    this.port = options.port;
    this.timeout = options.timeout || 3000;
    this.logger = options.logger || console;

    var self = this,
        logger = this.logger;

    this.socket = SocketClient('http://' + this.host + ':' + this.port);
    this.socket.on('connect', function () {
        logger.trace('Connected to configuration server.');
        refreshCachedConfig(self);
    });
    this.socket.on('configChanged', function (data) {
        var companyCode = data.companyCode;
        logger.trace("Config of '%s' changed, clear cache.", companyCode);
        ConfigurationCache.clearConfigByCompanyCode(companyCode);

        self.emit('change', data);
    });
}

util.inherits(ConfigurationClient, EventEmitter);


function getSectionValueFromServer(self, companyCode, sectionName, callback) {
    var url = 'http://' + self.host + ':' + self.port + '/v1/sections/' + encodeURIComponent(sectionName),
        requestOptions = {
            headers: {
                Accept: 'application/json',
                'Accept-Language': 'en-US',
                'Content-Type': 'application/json',
                'User-Agent': 'configuration-client/' + version,
                'x-company-code': companyCode
            },
            url: url,
            timeout: self.timeout,
            json: true
        };

    request.get(requestOptions, function (error, response, body) {
        if (error) {
            callback(error);
            return;
        }

        if (response.statusCode != 200) {
            error = body && body.meta && body.meta.error;
            callback(error);
            return;
        }

        callback(null, body.response);
    });
}

function refreshCachedConfig(self) {
    var cachedCompanyCodes = ConfigurationCache.getCachedCompanyCodesAndSectionNames();
    async.forEachSeries(Object.keys(cachedCompanyCodes), function (companyCode, callback) {
        refreshCachedConfigOfCompany(self, companyCode, cachedCompanyCodes[companyCode], function () {
            callback();
        });
    });
}

function refreshCachedConfigOfCompany(self, companyCode, sectionNames, callback) {
    async.forEachSeries(sectionNames, function (sectionName, callback) {
        getSectionValueFromServer(self, companyCode, sectionName, function (error, result) {
            if (error) {
                callback();
                return;
            }

            ConfigurationCache.setSectionValue(companyCode, sectionName, result);
            callback();
        });
    }, function (error) {
        callback(error);
    });
}

ConfigurationClient.prototype.getSectionValue = function (context, companyCode, sectionName, callback) {
    var self = this,
        logger = context.logger;

    logger.trace("Getting config value. companyCode: %s, sectionName: %s", companyCode, sectionName);
    logger.trace("Getting config value from cache.");
    ConfigurationCache.getSectionValue(companyCode, sectionName, function (error, result) {
        if (error) {
            callback(error);
            return;
        }

        if (result !== null) {
            logger.trace('Config value found in cache.');
            callback(null, result);
            return;
        }

        logger.trace('Config value not found in cache.');
        logger.trace("Getting config value from server: %s:%s", self.host, self.port);
        getSectionValueFromServer(self, companyCode, sectionName, function (error, result) {
            if (error) {
                callback(error);
                return;
            }

            ConfigurationCache.setSectionValue(companyCode, sectionName, result);
            callback(null, result);
        });
    });
};

ConfigurationClient.prototype.getSectionValueAsync = function (context, companyCode, sectionName) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.getSectionValue(context, companyCode, sectionName, function (error, result) {
            if (error) {
                reject(error);
                return;
            }

            resolve(result);
        })
    });
};

module.exports = ConfigurationClient;