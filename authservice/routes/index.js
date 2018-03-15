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
	var uuid = require('uuid');
	var log4js = require('log4js');

	log4js.configure('log4js.json', {});
	var logger = log4js.getLogger('authservice');
	logger.setLevel(settings.loggerLevel);

	var daModuleName = "../../dataaccess/"+dbtype+"/index.js";
	logger.info("Use dataaccess:"+daModuleName);

	module.removeAll = function (collectionname, callback /* (error, insertedDocument) */) {
		dataaccess.removeAll(collectionname, callback)
	};

	module.dbNames = dataaccess.dbNames

	module.initializeDatabaseConnections = function(callback/*(error)*/) {
		dataaccess.initializeDatabaseConnections(callback);
	}

	module.insertOne = function (collectionname, doc, callback /* (error, insertedDocument) */) {
		dataaccess.insertOne(collectionname, doc, callback)
	};

	module.login = function(req, res) {

		var login = req.body.login;
		var password = req.body.password;

		res.cookie('sessionid', '');
		// invalidate current session here??

		validateCustomer(login, password, function(err, customerValid) {
			if (err) {
				res.status(500).send(err); // TODO: do I really need this or is there a cleaner way??
				return;
			}

			if (customerValid == "false") {
				res.sendStatus(403);
			}
			else {
				createSession(login, function(error, sessioninfo) {
					if (error) {
						logger.info(error);
						res.send(500, error);
						return;
					}
					res.cookie('sessionid', sessioninfo._id);
					res.send('logged in');
				});
			}
		});
	};

	module.authcheck = function(req, res) {
		logger.debug('validate token ' + req.params.tokenid);

		validateSession(req.params.tokenid, function(error, cs){
			if (error){
				res.status(404).send(error);
			}
			else{
				res.send(JSON.stringify(cs));
			}
		})
	}

	module.logout = function (req, res){
		logger.debug("logging out " + req.cookies.sessionid);

		var sessionid = req.cookies.sessionid;
		invalidateSession(sessionid, function(error){
			if (error){
				res.status(404).send(error);
			} else {
				res.cookie('sessionid', '');
				res.send('logged out');
			}
		})
	}

	module.countCustomerSessions = function(req,res) {
		countItems(module.dbNames.customerSessionName, function (error,count){
			if (error){
				res.send("-1");
			} else {
				res.send(count.toString());
			}
		});
	};

	countItems = function(dbName, callback /*(error, count)*/) {
		logger.debug("Calling count on " + dbName);
		dataaccess.count(dbName, {}, function(error, count) {
			logger.debug("Output for "+dbName+" is "+count);
			if (error) callback(error, null);
			else {
				callback(null,count);
			}
		});
	};

	validateCustomer = function(login, password, callback) {

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

	}

	createSession = function(customerId, callback /* (error, session) */) {
		logger.debug("create session in DB:"+customerId);

		var now = new Date();
		var later = new Date(now.getTime() + 1000*60*60*24);

		var document = { "_id" : uuid.v4(), "customerid" : customerId, "lastAccessedTime" : now, "timeoutTime" : later };

		dataaccess.insertOne(module.dbNames.customerSessionName, document, function (error, doc){
			if (error) callback (error, null)
			else callback(error, document);
		});
	}

	validateSession = function(sessionId, callback /* (error, session) */){
		logger.debug("validate session in DB:"+sessionId);
		var now = new Date();

		dataaccess.findOne(module.dbNames.customerSessionName, sessionId, function(err, session) {
			if (err) callback (err, null);
			else{
				if (now > session.timeoutTime) {
					daraaccess.remove(module.dbNames.customerSessionName,{'_id':sessionid}, function(error) {
						callback(null, null);
					});
				}
				else
					callback(null, session);
			}
		});
	}

	invalidateSession = function(sessionid, callback /* error */) {
		logger.debug("invalidate session in DB:"+sessionid);
		dataaccess.remove(module.dbNames.customerSessionName,{'_id':sessionid},callback) ;
	}

	module.checkForValidSessionCookie = function(req, res, next) {
		logger.debug('checkForValidCookie');
		var sessionid = req.cookies.sessionid;
		if (sessionid) {
			sessiondid = sessionid.trim();
		}
		if (!sessionid || sessionid == '') {
			logger.debug('checkForValidCookie - no sessionid cookie so returning 403');
			res.sendStatus(403);
			return;
		}

		validateSession(sessionid, function(err, customerid) {
			if (err) {
				logger.debug('checkForValidCookie - system error validating session so returning 500');
				res.sendStatus(500);
				return;
			}

			if (customerid) {
				logger.debug('checkForValidCookie - good session so allowing next route handler to be called');
				req.acmeair_login_user = customerid;
				next();
				return;
			}
			else {
				logger.debug('checkForValidCookie - bad session so returning 403');
				res.sendStatus(403);
				return;
			}
		});
	}

	return module;
}