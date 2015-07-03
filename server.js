var fs = require("fs");
var net = require("net");
var http = require('http');
var Server = require('socket.io');
var config = JSON.parse(fs.readFileSync('config.json'));

var httpServer = require("http").createServer();
httpServer.listen(config.serverPort, config.serverAddress, function(){
    var address = httpServer.address();
    return console.log("server listening at", address);
});

var io = new Server(httpServer);
io.of('/').on('connection', function(socket) {

    socket.on('message', function(data, sessionCreated) {
        sessionCreated(data);

        io.of('/' + data).on('connection', function(clientSocket) {
            console.log("namespace socket is created:" + data);
            var remoteConnected = false;
            var remoteSocket = null;

            clientSocket.on('message', function(data, remoteConnectSuccess) {
                if (!remoteConnected) {
                    var remotePort = extractRemotePort(data);
                    var remoteAddr = extractRemoteAddress(data);

                    console.log('remote url ' +  remoteAddr + ":" +remotePort);
                    remoteSocket = net.connect(remotePort, remoteAddr, function() {
                        var buf = new Buffer(10);
                        buf.write("\u0005\u0000\u0000\u0001", 0, 4, "binary");
                        buf.write("\u0000\u0000\u0000\u0000", 4, 4, "binary");
                        buf.writeInt16BE(remotePort, 8);

                        remoteConnected = true;
                        remoteConnectSuccess(buf);
                    });

                    remoteSocket.on('data', function(data) {
                        console.log('remote response data: ' + data.length);
                        clientSocket.send(data);
                    });

                    remoteSocket.on('error', function(e) {
                        console.log('remote side connection error: ' + e);
                        remoteSocket.destroy();
                        clientSocket.disconnect();
                        remoteSocket = null;
                    });

                    clientSocket.on('close', function() {
                        remoteSocket.end();
                        remoteSocket = null;
                    });
                } else {
                    remoteSocket.write(data);
                }
            });
        });
    });
});

function extractRemoteAddress(data) {
    var addressType = data[3];
    if (addressType == 1) {
        return data[4] + '.' + data[5] + '.' + data[6] + '.' + data[7];
    } else if (addressType = 3) {
        var length = data[4];
        var addressData = data.slice(5, 5 + length);
        return new Buffer(addressData).toString('utf8');
    } else {
        return null;
    }
}

function extractRemotePort(data) {
    var addressType = data[3];
    if (addressType == 1) {
        return data.readUInt16BE(8);
    } else if (addressType = 3) {
        var length = data[4];
        return data.readUInt16BE(5 + length);
    } else {
        return null;
    }
}

