#!/bin/env node
//  OpenShift sample Node application

var express         = require('express');
var fs              = require('fs');
var cfg             = require('./configmgr');
var rest_routes     = require('./routes');

// open database files

// cfg.cfgOpenDb();

var theApplication = function() {

    //  Scope.
    var self = this;

    //  Helper functions.

     // Set up server IP address and port # using env variables/defaults.

    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.log(cfg.getLogHeader('SERVER', 'INFO') + 'No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
        console.log(cfg.getLogHeader('SERVER', 'INFO') + 'starting REST server IP address: %j Port: %j', self.ipaddress, self.port)

    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
            console.log(cfg.getLogHeader('SERVER', 'INFO') + 'received %s - terminating sample app ...',Date(Date.now()), sig);
           process.exit(1);
        }
        console.log(cfg.getLogHeader('SERVER', 'INFO') + 'node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.postRoutes = [];
        self.postRoutes ['/vote']    = rest_routes.REST_Vote;


        self.routes = { };

        self.routes['/votes']       = rest_routes.REST_Votes;
        self.routes['/voters']      = rest_routes.REST_Voters;
        self.routes['/vote']        = rest_routes.REST_Vote;
        self.routes['/project']     = rest_routes.REST_Project;
        self.routes['/projects']    = rest_routes.REST_Projects;
        self.routes['/resetv']      =   rest_routes.REST_ResetVotes;
        self.routes['/stat']        = rest_routes.REST_stat;



        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['*'] = function(req, res) {
            var url = req.originalUrl;
            if(url==='/') {
                url='/index.html';
            }

            url = url.indexOf('?')<0 ? url : url.substring(0,url.indexOf('?'));
			res.contentType(url.substring(url.lastIndexOf('/')+1));
			res.sendfile('./' + url);
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express(); // .createServer() deprecated;

        //  Add handlers for the app (from the routes). yaron
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }


        for (var r in self.postRoutes) {
            self.app.post(r, self.postRoutes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function () {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log(cfg.getLogHeader('SERVER', 'INFO') + 'node server started on %s:%d ...',Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};

/**
 *  main():  Main code.
 */
var zapp = new theApplication();
zapp.initialize();
zapp.start();

