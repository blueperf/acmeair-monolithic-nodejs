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
	var log4js = require('log4js');

	log4js.configure('log4js.json', {});
	var logger = log4js.getLogger('customerservice');
	logger.setLevel(settings.loggerLevel);

	var daModuleName = "../../dataaccess/"+dbtype+"/index.js";
	logger.info("Use dataaccess:"+daModuleName);

	module.dbNames = dataaccess.dbNames

	module.initializeDatabaseConnections = function(callback/*(error)*/) {
		dataaccess.initializeDatabaseConnections(callback);
	}

	module.insertOne = function (collectionname, doc, callback /* (error, insertedDocument) */) {
		dataaccess.insertOne(collectionname, doc, callback)
	};

	module.removeAll = function (collectionname, callback /* (error, insertedDocument) */) {
		dataaccess.removeAll(collectionname, callback)
	};

	module.getCustomerById = function(req, res) {
		logger.debug('getting customer by user ' + req.params.user);

		getCustomer(req.params.user, function(err, customer) {
			if (err) {
				res.sendStatus(500);
			}

			res.send(customer);
		});
	};

	module.validateId = function(req, res) {
		logger.info('verifying password for ' + req.body.login);
		getCustomer(req.body.login, function(err, customer) {
			if (err) {
				res.sendStatus(500);
			}
			logger.info(customer);
			if (req.body.password == customer.password) {
				res.send('{"validCustomer":"true"}');
			} else {
				res.send('{"validCustomer":"false"}');
			}
		});
	};

	module.putCustomerById = function(req, res) {
		logger.debug('putting customer by user ' + req.params.user);

		updateCustomer(req.params.user, req.body, function(err, customer) {
			if (err) {
				res.sendStatus(500);
			}
			res.send(customer);
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

	countItems = function(dbName, callback /*(error, count)*/) {
		console.log("Calling count on " + dbName);
		dataaccess.count(dbName, {}, function(error, count) {
			console.log("Output for "+dbName+" is "+count);
			if (error) callback(error, null);
			else {
				callback(null,count);
			}
		});
	};

	function getCustomer(username, callback /* (error, Customer) */) {
		dataaccess.findOne(module.dbNames.customerName, username, callback);
	}

	function updateCustomer(login, customer, callback /* (error, Customer) */) {						
		dataaccess.update(module.dbNames.customerName, customer,callback)
	}


	return module;
}