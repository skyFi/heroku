(function() {
    var fs = require("fs");
    var net = require("net");
    var http = require('http');
    var Server = require('socket.io');
    var uuid = require('uuid');

    var config = JSON.parse(fs.readFileSync('config.json'));

    var httpServer = require("http").createServer();
    httpServer.listen(config.port, config.address, function(){
        var address = httpServer.address();
        return console.log("server listening at", address);
    });

    var io = new Server(httpServer);
    io.on('connection', function (socket) {
        var pipe = createPipe(socket);
        console.log("pipe is created: " + pipe.id);

        socket.on('message', function(data) {
            if (pipe.connected) {
                pipe.sendToRemote(data);
            } else {
                pipe.connectToRemote(data);
            }
        });

        socket.on('disconnect', function () {
            pipe.destroy();
        });
    });

    function createPipe(clientSide) {
        var pipe = {
            id: uuid.v4(),
            connected: false,
            clientSide: clientSide,
            remoteSide: null,

            connectToRemote: function(data) {
                var self = this;
                var remotePort = extractRemotePort(data);
                var remoteAddr = extractRemoteAddress(data);

                self.remoteSide = net.connect(remotePort, remoteAddr, function() {
                    var buf = new Buffer(10);
                    buf.write("\u0005\u0000\u0000\u0001", 0, 4, "binary");
                    buf.write("\u0000\u0000\u0000\u0000", 4, 4, "binary");
                    buf.writeInt16BE(remotePort, 8);

                    self.sendToClient(buf);
                    self.connected = true;
                    console.log(self.id + ": connected to remote: " + remoteAddr + ":" + remotePort)
                });

                self.remoteSide.on("data", function(data) {
                    self.sendToClient(data);
                });

                self.remoteSide.on("end", function(){
                    self.destroy();
                });

                self.remoteSide.on("error", function(e) {
                    console.log("remote error: " + e);
                });
            },

            sendToRemote: function(data) {
                if (this.remoteSide) {
                    this.remoteSide.write(data);
                }
            },

            sendToClient: function(data) {
                if (this.clientSide) {
                    this.clientSide.send(data);
                }
            },

            destroy: function() {
                if (!this.closed) {
                    this.closed = true;

                    this.remoteSide.destroy();
                    this.remoteSide = null;

                    this.clientSide.disconnect();
                    this.clientSide = null;

                    console.log('destroy pipe: ' + this.id);
                }
            }
        };

        return pipe;
    }

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
}).call(this)
