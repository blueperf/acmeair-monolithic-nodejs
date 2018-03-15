## Acmeair NodeJS on Bluemix Container

Prereq:

[Install Docker and stared Docker daemon on your local machine](https://docs.docker.com/installation/)

[Install Cloud Foundry](http://docs.cloudfoundry.org/cf-cli/) & [IBM Containers Plugin](https://console.ng.bluemix.net/docs/containers/container_cli_cfic.html)

[Setup Compose Mongo DB & create acmeair database](https://www.compose.io/mongodb/)

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

* Mongo DB CF Bridge App:

	On Bluemix UI, go to dashboard
	
	Under “Cloud Foundry App”, click CREATE APP > WEB > SDK for Node.js > Continue > Enter “MongoBridge” as an app name > FINISH
	
	Click “Overview” from left navigator for “MongoBridge” app > Click “Bind a Service” > Select “mongoCompose” that you have created > ADD
	
Note: memory quota can be 64 MB


### Create each services in IBM Container service

* On local docker server, Go to the root directory of acmeair-nodejs

	Modify [Bluemix_Container.sh](Bluemix_Container.sh)
	
		Add your Namespace
	
		Add your Mongo DB CF Bridge Name
	
	If this is the first time set the namespace using the following command [cf ic namespace set](https://console.ng.bluemix.net/docs/containers/container_cli_login.html)
	
	If you forgot your namespace, run the following command to retrieve "cf ic namespace get"
	
	Run [Bluemix_Container.sh](Bluemix_Container.sh)
	