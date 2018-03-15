## Acmeair NodeJS on Bluemix 

Assume you have access to [Bluemix](https://console.ng.bluemix.net). 

	cf api api.ng.bluemix.net
	
	cf login

#### Create Mongo DB service
	   
Option 1 : Go to Bluemix Catalog, then create a "Compose for MongoDB" service provided by IBM

Option 2 : [Setup Compose Mongo DB & create acmeair database](https://www.compose.io/mongodb/)

* Retrieve & save these information from Compose Mongo DB

	hostname,"port", "db", "username", "password”

	Create a string:
	
	"url": "mongodb://username:password@hostname:port/db"
	e.g. mongodb://acmeuser:password@myServer.dblayer.com:27017/acmeair

* On cf cli, run following commands to create Compose Mongo DB service on Bluemix:

	Use CF command to create DB:
	cf cups mongoCompose -p "url"
	
	At the URL prompt, enter above URL that was created:
	url>mongodb://acmeuser:password@myServer.dblayer.com:27017/acmeair


### Preparation
	Edit [Bluemix_CF.sh](Bluemix_CF.sh) to change application name (appName).  "acmeair-node" is the application name and will be used for the hostname of the application. Add an identifiers to it to make it unique. (e.g. You could use the initials of your name.)
	Also change the Mongo DB Service name (mongoService).  ""
		

#### Create & start application
	Run previously modified shell script (make sure to change the permission of the file). It will deploy the application to Cloud Foundry, bind Mongo DB service, then startup the Acmeair Application.
	chmod 755 Bluemix_CF.sh
	./Bluemix_CF.sh
	
	Access application with the following URL (use your application name instead of "acmeair-node")	
	http://acmeair-node.mybluemix.net