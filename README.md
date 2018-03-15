
# Acme Air in NodeJS 

An implementation of the Acme Air sample application for NodeJS.  This implementation is a monolithic mode & mainly supports Mongo DB (both standalone & Compose Mongo DB).  It can support running on a variety of runtime platforms including standalone bare metal  system, Virtual Machines, docker containers, IBM Bluemix  Cloud Foundry Service and IBM Bluemix Container Service.

## Content

### Runtime Environment

[NodeJs](http://nodejs.org/download/)

### Datastore Choices

Environment variable dbtype is used to determine the datastore choice. MongoDB is default. See under "More on configurations".

* [Compose MongoDB](https://www.compose.com/mongodb) 
* [Compose MongoDB Bluemix Service](https://console.ng.bluemix.net/catalog/services/compose-for-mongodb/) 
* [MongoDB Standalone](http://www.mongodb.org) 
 
### Application Run Platforms

* [Bluemix Cloud Foundry Instructions](README_Bluemix.md)
* [Bluemix Container Service Instructions](README_Bluemix_Container.md)


## How to get started

Assume MongoDB started on 127.0.0.1:27017

### Resolve module dependencies

	npm install
	node_modules/.bin/npm install 

### Run Acmeair in Monolithic on Local
Change "port" in settings.json from 80 to 9080

	node app.js
	
### Access Monolithic Application 

	http://localhost:9080

## More on Configurations

### Environment Variables

Name | Default | Meaning
--- | --- | ---
dbtype | mongo | You can switch datastore choices.
MONGO_URL||Mongo database URL. Take precedence after Mongo DB Services, over other settings

### Configuration for Runtime

Default values are defined [here](settings.json)

Name | Default | Meaning
--- |:---:| ---
mongoHost | 127.0.0.1 | MongoDB host ip
mongoPort | 27017 | MongoDB port
mongoConnectionPoolSize | 10 | MongoDB connection pool size

* When running on Bluemix, datasource url will be read from bound service information.

### Configuration for Preload

Default values are defined [here](loader/loader-settings.json)

Name | Default | Meaning
--- |:---:| ---
MAX_CUSTOMERS | 10000 |  number of customers
MAX_DAYS_TO_SCHEDULE_FLIGHTS | 30 | max number of days to schedule flights
MAX_FLIGHTS_PER_DAY | 1 | max flights per day

## Other Topics

### How to extend with more datasource types

* Create a folder under dataaccess with the new dbtype name. Look at current implementation for reference.


* When drive acmeair workload, you need follow the [instruction](https://github.com/acmeair/acmeair/wiki/jMeter-Workload-Instructions) to use -DusePureIDs=true when starting jmeter.

### ICP ###
 For ICP, add the URL path in settings.json
 e.g. "contextRoot": "/node"
 Add the same extension in ingICP.yaml
 e.g. path: /node

