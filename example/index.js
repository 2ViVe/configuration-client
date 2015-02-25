var Lighter = require('nodejs-lighter');
var config = require('./config.sample.json');
var ConfigurationClient = require('../index');

var lighter = new Lighter(config);
var logger = lighter.logger;
var middlewares = lighter.middlewares;

lighter.use(middlewares.contextCreator());
lighter.use(middlewares.logger(logger));

var configClient = new ConfigurationClient(config.configurationService);

lighter.get('/config', function (req, res, next) {
    configClient.getSectionValue(req.context, 'BB', 'cluster', function (error, result) {
        if (error) {
            next(error);
            return;
        }

        next({body: result});
    });
});

lighter.use(middlewares.responder);

lighter.run();

