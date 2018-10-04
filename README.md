
# Acme Air in NodeJS 

An implementation of the Acme Air sample application for NodeJS.  This implementation is a monolithic mode & supports Mongo DB (both standalone & Compose Mongo DB).  The application can be deployed both on-prem as well as on Cloud platforms. 

# Setup

  **Setup DB**
 - First, create a Compost account, then create a Mongo DB Deployment (It is a paid service with 30 days free trial)
 - Create a database with the name "acmeair"
 - get these information:
   - "hostname
   - "port"
   - "db"
   - "username"
   - "password"
 
# For CF
 - ibmcloud cf push acme-node-myname -m 512M

Add these environment variables and restage
   - MONGO_MANUAL : true
   - MONGO_HOST : <hostname>
   - MONGO_PORT : <port>
   - MONGO_DBNAME : <db>
   - MONGO_USER : <username>
   - MONGO_PASSWORD : <password>

(Alternative) 
**Create user provided DB Service**
- Create a string using Compose database information:
   - "url": "mongodb://username:password@hostname:port/db"
   - e.g. mongodb://acmeuser:password@myServer.dblayer.com:27017/acmeair
 
- Use CF command to create DB:
   - cf cups mongodbCompose -p "url"
   - At the URL prompt, enter above URL that was created:
   - url>mongodb://acmeuser:password@myServer.dblayer.com:27017/acmeair
 
- On IBM Cloud Dasboard, bind the created mongodbCompose service to Acmeair
   - restage/restart Acmeair application 

# For Kubernetes Services
 - docker build -f ./Dockerfile_KS -t registry.**REGION**.bluemix.net/**NAMESPACE**/IMAGENAME .
 - docker push registry.**REGION**.bluemix.net/**NAMESPACE**/IMAGENAME
 - Modify acmeair-monolithic-nodejs.yaml to add registry.**REGION**.bluemix.net/**NAMESPACE**/IMAGENAME as the image name
 - Modify acmeair-monolithic-nodejs.yaml to add DB connection information (Note: If there is no user setup for this DB, REMOVE MONGO_USER & MONGO_PASSWORD entries)
 - kubectl create -f ./acmeair-monolithic-node.s.yaml

# Database loading
 - Go to the home page http://hostname:port
 - At the bottom of the page, click the link : Configure the Acme Air Environment > Click **Load the database**
 
# Driving the load
 - Follow the instruction [here](https://github.com/blueperf/acmeair-driver)