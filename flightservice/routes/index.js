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
	var debug = require('debug')('flight');
	var flightCache = require('ttl-lru-cache')({maxLength:settings.flightDataCacheMaxSize});
	var flightSegmentCache = require('ttl-lru-cache')({maxLength:settings.flightDataCacheMaxSize});
	var flightDataCacheTTL = settings.flightDataCacheTTL == -1 ? null : settings.flightDataCacheTTL; 

	log4js.configure('log4js.json', {});
	var logger = log4js.getLogger('flightservice');
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

	module.queryflights = function(req, res) {
		var fromAirport = req.body.fromAirport;
		var toAirport = req.body.toAirport;
		var oneWay = (req.body.oneWay == 'true');
		var fromDateWeb = new Date(req.body.fromDate);
		var returnDateWeb = new Date(req.body.returnDate);
		searchFlights(fromAirport, toAirport, oneWay, fromDateWeb, returnDateWeb, function(values){
			res.send(values)

		});
	}

	module.searchFlights = function (fromAirport, toAirport, oneWay, fromDateWeb, returnDateWeb, callback) {
		searchFlights(fromAirport, toAirport, oneWay, fromDateWeb, returnDateWeb, callback);
	}
	function searchFlights(fromAirport, toAirport, oneWay, fromDateWeb, returnDateWeb, callback) {
		logger.debug('querying flights');

		//If your acmeair is in another time zone (e.g. Your browser is in EST & Acmeair server is in CST), fromDate will be 1 day behind than fromDateWeb & won't query 
		var fromDate = new Date(fromDateWeb.getFullYear(), fromDateWeb.getMonth(), fromDateWeb.getDate()); // convert date to local timezone
		var returnDate;
		if (!oneWay) {
			returnDate = new Date(returnDateWeb.getFullYear(), returnDateWeb.getMonth(), returnDateWeb.getDate()); // convert date to local timezone
		}
		getFlightByAirportsAndDepartureDate(fromAirport, toAirport, fromDate, function (error, flightSegmentOutbound, flightsOutbound) {
			logger.debug('flightsOutbound = ' + flightsOutbound);
			if (flightsOutbound) {
				for (ii = 0; ii < flightsOutbound.length; ii++) {
					flightsOutbound[ii].flightSegment = flightSegmentOutbound;
				}
			}
			else {
				flightsOutbound = [];
			}
			if (!oneWay) {
				getFlightByAirportsAndDepartureDate(toAirport, fromAirport, returnDate, function (error, flightSegmentReturn, flightsReturn) {
					logger.debug('flightsReturn = ' + JSON.stringify(flightsReturn));
					if (flightsReturn) {
						for (ii = 0; ii < flightsReturn.length; ii++) {
							flightsReturn[ii].flightSegment = flightSegmentReturn;
						}
					}
					else {
						flightsReturn = [];
					}
					var options = {"tripFlights":
						[
						 {"numPages":1,"flightsOptions": flightsOutbound,"currentPage":0,"hasMoreOptions":false,"pageSize":10},
						 {"numPages":1,"flightsOptions": flightsReturn,"currentPage":0,"hasMoreOptions":false,"pageSize":10}
						 ], "tripLegs":2};

					debug('options', options);
					callback(options);
				});
			}
			else {
				var options = {"tripFlights":
					[
					 {"numPages":1,"flightsOptions": flightsOutbound,"currentPage":0,"hasMoreOptions":false,"pageSize":10}
					 ], "tripLegs":1};
				callback(options);
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


	function getFlightByAirportsAndDepartureDate(fromAirport, toAirport, flightDate, callback /* error, flightSegment, flights[] */) {
		logger.debug("getFlightByAirportsAndDepartureDate " + fromAirport + " " + toAirport + " " + flightDate);

		getFlightSegmentByOriginPortAndDestPort(fromAirport, toAirport, function(error, flightsegment) {
			if (error) {
				logger.error("Hit error:"+error);
				throw error;
			}

			logger.debug("flightsegment = " + JSON.stringify(flightsegment));
			if (!flightsegment) {
				callback(null, null, null);
				return;
			}

			var date = new Date(flightDate.getFullYear(), flightDate.getMonth(), flightDate.getDate(),0,0,0,0);

			var cacheKey = flightsegment._id + "-" + date.getTime();
			if (settings.useFlightDataRelatedCaching) {
				var flights = flightCache.get(cacheKey);
				if (flights) {
					logger.debug("cache hit - flight search, key = " + cacheKey);
					callback(null, flightsegment, (flights == "NULL" ? null : flights));
					return;
				}
				logger.debug("cache miss - flight search, key = " + cacheKey + " flightCache size = " + flightCache.size());
			}
			var searchCriteria = {flightSegmentId: flightsegment._id, scheduledDepartureTime: date};
			dataaccess.findBy(module.dbNames.flightName, searchCriteria, function(err, docs) {
				if (err) {
					logger.error("hit error:"+err);
					callback (err, null, null);
				}else
				{
					("after cache miss - key = " + cacheKey + ", docs = " + JSON.stringify(docs));

					var docsEmpty = !docs || docs.length == 0;

					if (settings.useFlightDataRelatedCaching) {
						var cacheValue = (docsEmpty ? "NULL" : docs);
						("about to populate the cache with flights key = " + cacheKey + " with value of " + JSON.stringify(cacheValue));
						flightCache.set(cacheKey, cacheValue, flightDataCacheTTL);
						("after cache populate with key = " + cacheKey + ", flightCacheSize = " + flightCache.size())
					}
					callback(null, flightsegment, docs);
				}
			});
		});
	}

	function getFlightSegmentByOriginPortAndDestPort(fromAirport, toAirport, callback /* error, flightsegment */) {
		var segment;

		if (settings.useFlightDataRelatedCaching) {
			segment = flightSegmentCache.get(fromAirport+toAirport);
			if (segment) {
				("cache hit - flightsegment search, key = " + fromAirport+toAirport);
				callback(null, (segment == "NULL" ? null : segment));
				return;
			}
			("cache miss - flightsegment search, key = " + fromAirport+toAirport + ", flightSegmentCache size = " + flightSegmentCache.size());
		}
		dataaccess.findBy(module.dbNames.flightSegmentName,{originPort: fromAirport, destPort: toAirport},function(err, docs) {
			if (err) callback (err, null);
			else {
				segment = docs[0];
				if (segment == undefined) {
					segment = null;
				}
				if (settings.useFlightDataRelatedCaching) {
					("about to populate the cache with flightsegment key = " + fromAirport+toAirport + " with value of " + JSON.stringify(segment));
					flightSegmentCache.set(fromAirport+toAirport, (segment == null ? "NULL" : segment), flightDataCacheTTL);
					("after cache populate with key = " + fromAirport+toAirport + ", flightSegmentCacheSize = " + flightSegmentCache.size())
				}
				callback(null, segment);
			}
		});
	}

	return module;
}