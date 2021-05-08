const express = require("express");
const os = require("os");

const app = express();
var
    // Local ip address that we're trying to calculate
    address
    // Network interfaces
    ,ifaces = os.networkInterfaces();


// Iterate over interfaces ...
for (var dev in ifaces) {

    // ... and find the one that matches the criteria
    var iface = ifaces[dev].filter(function(details) {
        return details.family === 'IPv4' && details.internal === false;
    });

    if(iface.length > 0) address = iface[0].address;
}

app.get("/", (req, res) => {
  res.send("Hello from container " + os.hostname() + ", My IP is " + address);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
