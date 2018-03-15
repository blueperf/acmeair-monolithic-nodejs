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

module.exports = function (dataaccess, dbtype, settings) {
	var module = {};
	var debug = require('debug')('routes');
	var uuid = require('uuid');
	var log4js = require('log4js');

	/**
	 * initialize for Watson services
	var vcapUrl = null;
	var vcapUsername = null;
	var vcapPassword = null;

	if (process.env.VCAP_SERVICES) {
		var services = JSON.parse(process.env.VCAP_SERVICES);
		for (var service_name in services) {
			if (service_name.indexOf('dialog') === 0) {
				var service = services[service_name][0];
				vcapUrl = service.credentials.url;
				vcapUsername = service.credentials.username;
				vcapPassword = service.credentials.password;
			}
		}
	}
	*/

	//logging configurations
	log4js.configure('log4js.json', {});
	var logger = log4js.getLogger('main_app');
	logger.setLevel(settings.loggerLevel);

	module.dbNames = dataaccess.dbNames

	module.initializeDatabaseConnections = function(callback/*(error)*/) {
		dataaccess.initializeDatabaseConnections(callback)
	}

	module.initialize = function (callback) {
		dataaccess.initialize(callback);
	};
	
	module.closeDBConnection = function(callback){
		dataaccess.closeConnection(callback);
	}

	module.insertOne = function (collectionname, doc, callback /* (error, insertedDocument) */) {
		dataaccess.insertOne(collectionname, doc, callback)
	};


	module.login = function(req, res) {
		logger.debug('logging in user');
		var login = req.body.login;
		var password = req.body.password;

		res.cookie('sessionid', '');

		// replace eventually with call to business logic to validate customer
		validateCustomer(login, password, function(err, customerValid) {
			if (err) {
				res.send(500,err); // TODO: do I really need this or is there a cleaner way??
				return;
			}

			if (!customerValid) {
				res.sendStatus(403);
			}
			else {
				createSession(login, function(error, sessionid) {
					if (error) {
						logger.info(error);
						res.send(500, error);
						return;
					}
					res.cookie('sessionid', sessionid);
					res.send('logged in');
				});
			}
		});
	};

	function validateCustomer(username, password, callback /* (error, boolean validCustomer) */) {
		dataaccess.findOne(module.dbNames.customerName, username, function(error, customer){
			if (error) callback (error, null);
			else{
				if (customer)
				{
					callback(null, customer.password == password);
				}
				else
					callback(null, false)
			}
		});
	};

	function createSession(customerId, callback /* (error, sessionId) */) {
		var now = new Date();
		var later = new Date(now.getTime() + 1000*60*60*24);

		var document = { "_id" : uuid.v4(), "customerid" : customerId, "lastAccessedTime" : now, "timeoutTime" : later };

		dataaccess.insertOne(module.dbNames.customerSessionName, document, function (error, doc){
			if (error) callback (error, null)
			else callback(error, document._id);
		});
	}

	module.logout = function(req, res) {
		logger.debug('logging out user');

		var sessionid = req.cookies.sessionid;
		var login = req.body.login;
		invalidateSession(sessionid, function(err) {
			res.cookie('sessionid', '');
			res.send('logged out');
		});
	};

	function invalidateSession(sessionid, callback /* error */) {
		dataaccess.remove(module.dbNames.customerSessionName,{'_id':sessionid},callback) 
	}

	/*
	 * STAY
	 */
	module.getRuntimeInfo = function(req,res) {
		var runtimeInfo = [];
		runtimeInfo.push({"name":"Runtime","description":"NodeJS"});
		var versions = process.versions;
		for (var key in versions) {
			runtimeInfo.push({"name":key,"description":versions[key]});
		}
		res.contentType('application/json');
		res.send(JSON.stringify(runtimeInfo));
	};

	module.getDataServiceInfo = function(req,res) {
		var dataServices = [{"name":"cassandra","description":"Apache Cassandra NoSQL DB"},
		                    {"name":"cloudant","description":"IBM Distributed DBaaS"},
		                    {"name":"mongo","description":"MongoDB NoSQL DB"}];
		res.send(JSON.stringify(dataServices));
	};

	module.getActiveDataServiceInfo = function (req,res) {
		res.send(dbtype);
	};

	module.countBookings = function(req,res) {
		countItems(module.dbNames.bookingName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};

	module.countCustomer = function(req,res) {
		countItems(module.dbNames.customerName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};

	module.countCustomerSessions = function(req,res) {
		countItems(module.dbNames.customerSessionName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};

	module.countFlights = function(req,res) {
		countItems(module.dbNames.flightName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};

	module.countFlightSegments = function(req,res) {
		countItems(module.dbNames.flightSegmentName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};

	module.countAirports = function(req,res) {
		countItems(module.dbNames.airportCodeMappingName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};

	function countItems(dbName, callback /*(error, count)*/) {
		console.log("Calling count on " + dbName);
		dataaccess.count(dbName, {}, function(error, count) {
			console.log("Output for "+dbName+" is "+count);
			if (error) callback(error, null);
			else {
				callback(null,count);
			}
		});
	};

	return module;
}

