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
	var logger = log4js.getLogger('bookingservice');
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

	module.bookflights = function(req, res) {
		logger.debug('booking flights');

		var userid = req.body.userid;
		var toFlight = req.body.toFlightId;
		var retFlight = req.body.retFlightId;
		var oneWay = (req.body.oneWayFlight == 'true');

		logger.debug("toFlight:"+toFlight+",retFlight:"+retFlight);

		bookFlight(toFlight, userid, function (error, toBookingId) {
			if (!oneWay) {
				bookFlight(retFlight, userid, function (error, retBookingId) {
					var bookingInfo = {"oneWay":false,"returnBookingId":retBookingId,"departBookingId":toBookingId};
					res.header('Cache-Control', 'no-cache');
					res.send(bookingInfo);
				});
			}
			else {
				var bookingInfo = {"oneWay":true,"departBookingId":toBookingId};
				res.header('Cache-Control', 'no-cache');
				res.send(bookingInfo);
			}
		});
	};

	var payload;
	function extend(target) {
		var sources = [].slice.call(arguments, 1);
		sources.forEach(function (source) {
			for (var prop in source) {
				target[prop] = source[prop];
			}
		});
		return target;
	}

	if(settings.payload){
		loadPayload(settings.payload, function (error, content) {
			logger.debug("Payload content : " + content);	
		});
	}

	module.loadPayload = function(req, res) {
		var payloadName = req.body.payload;
		var debug = require('debug')('payload');
		debug('Loading Payload : ' + payloadName);
		loadPayload(payloadName, function (error, content) {
			res.send(content);	
		});
	}

	function loadPayload(payloadName, callback){
		var fs = require('fs');
		var path = require('path');
		var filePath = path.join(__dirname, "/../../" + payloadName);
		logger.debug('Payload Path : ' + __dirname + '/../../' + payloadName);

		fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
			if (!err){
				payload = JSON.parse(data.toString());
				logger.info("Payload file : " + payloadName + " is loaded.");
				logger.debug("Payload content in function : " + payload);
				callback(null, payload);
			}
			else {
				logger.debug("Problem reading payload file");
				callback ("Problem reading payload file", null);
			}
		});
	}


	module.bookflightsWithPayload = function(req, res) {
		logger.debug('booking flights');

		var userid = req.body.userid;
		var toFlight = req.body.toFlightId;
		var retFlight = req.body.retFlightId;
		var oneWay = (req.body.oneWayFlight == 'true');

		logger.debug("toFlight:"+toFlight+",retFlight:"+retFlight);

		bookFlight(toFlight, userid, function (error, toBookingId) {
			if (!oneWay) {
				bookFlight(retFlight, userid, function (error, retBookingId) {
					var bookingInfo = {"oneWay":false,"returnBookingId":retBookingId,"departBookingId":toBookingId};
					res.header('Cache-Control', 'no-cache');
					res.send(extend({}, bookingInfo,payload));
				});
			}
			else {
				var bookingInfo = {"oneWay":true,"departBookingId":toBookingId};
				res.header('Cache-Control', 'no-cache');
				res.send(extend({}, bookingInfo,payload));
			}
		});
	};


	module.cancelBooking = function(req, res) {

		var number = req.body.number;
		var userid = req.body.userid;

		cancelBooking(number, userid, function (error) {
			if (error) {
				res.send({'status':'error'});
			}
			else {
				res.send({'status':'success'});
			}
		});
	};

	module.bookingsByUser = function(req, res) {
		logger.debug('listing booked flights by user ' + req.params.user);

		getBookingsByUser(req.params.user, function(err, bookings) {
			if (err) {
				res.sendStatus(500);
			}

			res.send(bookings);
		});
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

	function getBookingsByUser(username, callback /* (error, Bookings) */) {
		dataaccess.findBy(module.dbNames.bookingName, {'customerId':username},callback)
	}

	function bookFlight(flightId, userid, callback /* (error, bookingId) */) {

		var now = new Date();
		var docId = uuid.v4();

		var document = { "_id" : docId, "customerId" : userid, "flightId" : flightId, "dateOfBooking" : now,  "bookingId" : docId };

		dataaccess.insertOne(module.dbNames.bookingName,document,function(err){
			callback(err, docId);
		});
	}

	function cancelBooking(bookingid, userid, callback /*(error)*/) {
		dataaccess.remove(module.dbNames.bookingName,{'_id':bookingid, 'customerId':userid}, callback)
	}



	return module;
}