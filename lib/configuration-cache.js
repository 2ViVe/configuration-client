var configMapByCompanyCode = {};

exports.getSectionValue = function (companyCode, sectionName, callback) {
    if (!configMapByCompanyCode.hasOwnProperty(companyCode)) {
        callback(null, null);
        return;
    }

    var config = configMapByCompanyCode[companyCode];
    if (!config || !config.hasOwnProperty(sectionName)) {
        callback(null, null);
        return;
    }

    callback(null, config[sectionName]);
};

exports.setSectionValue = function (companyCode, sectionName, value, callback) {
    var config = configMapByCompanyCode[companyCode];
    if (!config) {
        config = configMapByCompanyCode[companyCode] = {};
    }

    config[sectionName] = value;
    if (callback) {
        callback();
    }
};

exports.clearConfigByCompanyCode = function (companyCode) {
    delete configMapByCompanyCode[companyCode];
};

exports.getCachedCompanyCodesAndSectionNames = function () {
    var cachedCompanyCodes = {};
    Object.keys(configMapByCompanyCode).forEach(function (companyCode) {
        cachedCompanyCodes[companyCode] = Object.keys(configMapByCompanyCode[companyCode]);
    });

    return cachedCompanyCodes;
};