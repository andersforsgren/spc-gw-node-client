#!/usr/bin/env node

var cfg = require("./config.js");
var express = require("express");
var digestAuthRequest = require("./digest.js");
var Notifier = require("./notify.js");
var fs = require("fs");
var path = require("path");


// SPC web gateway
var spc_ws_protocol = cfg.spc_use_ssl ? "wss" : "ws";
var spc_http_protocol = cfg.spc_use_ssl ? "https" : "http";
var spc_gw_ws = spc_ws_protocol+"://"+cfg.spc_gw_host+":"+cfg.spc_gw_port;
var get_url = spc_http_protocol +"://"+cfg.spc_gw_host+":"+cfg.spc_gw_port+"/spc/area/1";
var put_url_on = spc_http_protocol +"://"+cfg.spc_gw_host+":"+cfg.spc_gw_port+"/spc/area/1/set";
var put_url_off = spc_http_protocol +"://"+cfg.spc_gw_host+":"+cfg.spc_gw_port+"/spc/area/1/unset";

// Create and start the websocket listener
var moment = require("moment");
var Prowl = require("node-prowl");
var prowl = new Prowl(cfg.prowl_api_key);
var ws_url = spc_gw_ws + "/ws/spc?username=" + cfg.spc_ws_user + "&password=" + cfg.spc_ws_password;
var notifier = new Notifier(ws_url, cfg.messages, prowlMessage);
notifier.run();

// Create the express application
var app = express();

var key = fs.readFileSync(path.join(__dirname, './ssl/server.key'));
var cert = fs.readFileSync(path.join(__dirname, './ssl/server.crt'));
var https_options = {
    key: key,
    cert: cert
};

// Client (static) content
app.use(express.static("client"));

// Set up headers
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
});

// Authentication module. 
var auth = require('http-auth');
var basic = auth.basic({
        realm: "spc-gw-node-client"
    }, function (username, password, callback) { 		
        callback(username === cfg.username && password === cfg.password);
    }
);
app.use(auth.connect(basic));
    
if (cfg.use_ssl) 
{	
	var https = require("https");
	server = https.createServer(https_options, app).listen(cfg.port);	
}
else
{
	var https = require("https");
	server = http.createServer(app).listen(cfg.port);
}

app.get("/alarm", function (req, res) {
 getStatus(res);
});
app.put("/alarm/on", function (req, res) {
 console.log("[app] requst /alarm/on");
 setArmedStatus(true, res);
});
app.put("/alarm/off", function (req, res) {
 console.log("[app] requst /alarm/off");
 setArmedStatus(false, res);
});
console.log("[app] Application listening on %s using ssl? %s", server.address().port, cfg.use_ssl);


function getStatus(res){    
    var req = new digestAuthRequest("GET", get_url, cfg.spc_get_user, cfg.spc_get_password);    
    req.request(function(data) {                 
        var areaStatus = data.data.area[0];              
        
        // Armed yes/no
        var armed = areaStatus.mode > 0;            
   
        // Last arm/disarm user and time
        var lastUser, lastTime;
        if (armed) {
            lastTime = areaStatus.last_set_time;
            lastUser = areaStatus.last_set_user_name;
        } else {        
            lastTime = areaStatus.last_unset_time;
            lastUser = areaStatus.last_unset_user_name;   
        }
        res.json({success : true, armed : armed, user : lastUser, time: +lastTime});
    },function(errorCode) { 
        console.log("[app] Err: "+errorCode);
        res.json({success : false, errorCode : errorCode });
    });    
}


function setArmedStatus(armed, res){
    var url = armed ? put_url_on : put_url_off;
    var req = new digestAuthRequest("PUT", url, cfg.spc_put_user, cfg.spc_put_password);            
    req.request(function(data) {                 
        res.json({success : true });
    },function(errorCode) {        
        res.json({success : false, errorCode : errorCode });
    });    
}

function prowlMessage(message, timestamp){    
   var timestr = moment.unix(timestamp).locale(cfg.notification_datetime_locale).format(cfg.notification_datetime_format);
   var msg = timestr + " " + message;
   prowl.push(msg, cfg.notification_subject, function(err, remaining){
      if (err) {
          console.log("[app] ERROR: Unable to deliver notification " + err.toString());
      }
      else if (remaining < 50) {
          console.log("[app] WARNING: prowl API messages remaining " + remaining);
      }
   });
}