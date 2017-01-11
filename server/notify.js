// Notifier: listens to SIA events from the SPC Web gateway websocket interface.

// Accept self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var WebSocket = require("websocket");
      
function Notifier(ws_url, messages, notifyCallback) {        
    this.spc_gw_ws_url = ws_url;        
    this.ws_client = new WebSocket.client();    
    this.messages = messages;    
    this.run = function(){
        console.log("[notifier] Starting" + this.spc_gw_ws_url);
        this.ws_client.connect(this.spc_gw_ws_url);

        this.ws_client.on("connectFailed", function(error) {
            console.log("[notifier] WS connection failed " + error.toString());
        });

        this.ws_client.on("connect", function(connection) {
            console.log("[notifier] WS client connected");
            connection.on("error", function(error) {
                console.log("[notifier] WS connection Error: " + error.toString());
            });
            connection.on("close", function() {
                console.log("[notifier] WS connection Closed");
            });
            connection.on("message", function(message) {
                if (message.type !== "utf8")
                    return;
                     
                var msgData = JSON.parse(message.utf8Data);
                if (msgData.status !== "success") 
                    return;
                
                var ev = msgData.data.sia;
                if (!messages[ev.sia_code])                 
                    return;
                
                var descs = ev.description.split("¦");
                var msg = messages[ev.sia_code].replace("{$1}", descs[0]).replace("{$2}", descs[1]);        
                notifyCallback(msg, ev.timestamp);                
            });
        });                
    }                
}

module.exports = Notifier;
            

      
