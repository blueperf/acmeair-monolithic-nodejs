/*******************************************************************************
 * Copyright (c) 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *******************************************************************************/

var express = require('express')
, http = require('http')
, fs = require('fs')
, log4js = require('log4js');
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
var debug = require('debug')('acmeair');

var logger = log4js.getLogger('monolithic');
logger.setLevel(settings.loggerLevel);
log4js.configure('log4js.json', {});

console.log(process.env);

var port = (process.env.PORT || process.env.VCAP_APP_PORT || settings.port);
var dbtype = process.env.dbtype || "mongo";
logger.info("db type=="+dbtype);

var daModuleName = "./dataaccess/"+dbtype+"/index.js";
logger.info("Use dataaccess:"+daModuleName);
debug("Use dataaccess:", daModuleName);
var dataaccess = new require(daModuleName)(settings);

var app = express();
var morgan         = require('morgan');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');

var router = express.Router(); 		
var routes = null;
var loader = null;

var initialized = false;
var serverStarted = false;

initDB();

function initDB(){
	if (initialized ) return;
	var SLEEP_TIME= 5000;
	var registrationId = setInterval(function() {
		dataaccess.initializeDatabaseConnections(function(error) {
			if (error) {
				logger.info('Error connecting to database - exiting process: '+ error);
				// Do not stop the process for debug in container service
				//process.exit(1); 
			}else{
				initialized = true;
				clearInterval(registrationId);
				logger.info("Initialized database connections");

				var authRoutes = new require('./authservice/routes/index.js')(dataaccess,dbtype,settings); 
				var bookingRoutes = new require('./bookingservice/routes/index.js')(dataaccess,dbtype,settings); 
				var customerRoutes = new require('./customerservice/routes/index.js')(dataaccess,dbtype,settings); 
				var flightRoutes = new require('./flightservice/routes/index.js')(dataaccess,dbtype,settings); 
				routes = new require('./main/routes/index.js')(dataaccess,dbtype, settings);
				loader = new require('./loader/loader.js')(routes, settings);

				app.use(express.static(__dirname + '/public'));     	// set the static files location /public/img will be /img for users
				if (settings.useDevLogger)
					app.use(morgan('dev'));                     		// log every request to the console

				//create application/json parser
				var jsonParser = bodyParser.json();
				// create application/x-www-form-urlencoded parser
				var urlencodedParser = bodyParser.urlencoded({ extended: false });

				app.use(jsonParser);
				app.use(urlencodedParser);
				//parse an HTML body into a string
				app.use(bodyParser.text({ type: 'text/html' }));

				app.use(methodOverride());                  			// simulate DELETE and PUT
				app.use(cookieParser());                  				// parse cookie

				// main app
				router.post('/auth/login', login);
				router.get('/auth/login/logout', logout);

				// flight service
				router.post('/flight/queryflights', authRoutes.checkForValidSessionCookie, flightRoutes.queryflights);
				if(settings.payload){
					router.post('/booking/bookflights', authRoutes.checkForValidSessionCookie, bookingRoutes.bookflightsWithPayload);
					router.post('/booking/payload', authRoutes.checkForValidSessionCookie, bookingRoutes.loadPayload);
				}else {
					router.post('/booking/bookflights', authRoutes.checkForValidSessionCookie, bookingRoutes.bookflights);
				}
				router.post('/booking/cancelbooking', authRoutes.checkForValidSessionCookie, bookingRoutes.cancelBooking);
				router.get('/booking/byuser/:user', authRoutes.checkForValidSessionCookie, bookingRoutes.bookingsByUser);

				router.get('/customer/byid/:user', authRoutes.checkForValidSessionCookie, customerRoutes.getCustomerById);
				router.post('/customer/byid/:user', authRoutes.checkForValidSessionCookie, customerRoutes.putCustomerById);

				// main app
				router.get('/config/runtime', routes.getRuntimeInfo);
				router.get('/config/dataServices', routes.getDataServiceInfo);
				router.get('/config/activeDataService', routes.getActiveDataServiceInfo);
				router.get('/config/countBookings', routes.countBookings);
				router.get('/config/countCustomers', routes.countCustomer);
				router.get('/config/countSessions', routes.countCustomerSessions);
				router.get('/config/countFlights', routes.countFlights);
				router.get('/config/countFlightSegments', routes.countFlightSegments);
				router.get('/config/countAirports' , routes.countAirports);
				router.get('/loader/load', startLoadDatabase);
				router.get('/loader/query', loader.getNumConfiguredCustomers);

				//default
				router.get('/checkstatus', checkStatus);

				/* To add support service, comment out the following, then write the code in /supportservice/routes/index.js
				var supportRoutes = new require('./supportservice/routes/index.js')(flightRoutes,dbtype,settings); 
				if (process.env.SUPPORT_SERVICE){

					//for REST API watson dialog service
					router.get('/WatsonSupportInit', supportRoutes.getSupportInitInfo);
					router.post('/WatsonSupportService', supportRoutes.getSupportService);
				}

				//Set WEBSOCKET_SERVICE environment variable = true to use this service
				if (process.env.WEBSOCKET_SERVICE){
					var ws = require('ws').Server;
					//for websocket watson dialog service
					router.get('/support', supportRoutes.getSupportWSPort);

					var websocket = new require('./websocketservice/index.js')(flightRoutes, settings);
					debug("websocketPort", settings.websocketPort );
					
					//NOTE: Websocket must have its own port number. It cannot run in Cloud Foundry because Current code conflicts the port number with HTTP & chat will not function.
					
					var wss = new ws({port:(process.env.VCAP_APP_PORT || settings.websocketPort)});
					wss.on('connection', websocket.chat);
				}
				*/
 
				app.use(settings.contextRoot, router);
			}
		});
	}, SLEEP_TIME);
	startServer();
}

function checkStatus(req, res){
	res.sendStatus(200);
}

function login(req, res){
	routes.login(req, res);
}


function logout(req, res){
	routes.logout(req, res);
}


function startLoadDatabase(req, res){
	loader.startLoadDatabase(req, res);
}

function startServer() {
	app.listen(port);   
	logger.info("Express server listening on port " + port);
}