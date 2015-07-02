(function() {
    var fs = require("fs");
    var net = require("net");
    var Client = require('socket.io-client');
    var uuid = require('uuid');

    var config = JSON.parse(fs.readFileSync('config.json'));

    var localServer = net.createServer(function(connection) {
        connection.on("error", function(e) {
            console.log("local error: " + e);
            localServer.getConnections(function(err, count) {
                console.log("concurrent connections:", count);
            });
        });

        var pipe = createPipe(connection);

        connection.on("end", function(){
            pipe.destroy();
        });

        var serverUrl = "http://" + config.remoteAddress + ":" + config.remotePort;
        pipe.connectToServer(serverUrl);
    });

    localServer.listen(config.localPort, config.localAddress, function() {
        var address = localServer.address();
        return console.log("local server listening at", address);
    });

    localServer.on("error", function(e) {
        if (e.code === "EADDRINUSE") {
          console.log("address in use, aborting");
        }
        return process.exit(1);
    });

    function createPipe(clientSide) {
        var pipe = {
            id: uuid.v4(),
            state: 'init', //'init', 'auth', 'connecting', 'transfer', 'closed'
            serverSide: null,
            clientSide: clientSide,

            connectToServer: function(serverUrl) {
                var self = this;

                self.serverSide = new Client(serverUrl, {multiplex: false});

                self.serverSide.on('disconnect', function() {
                    self.destroy();
                });

                self.serverSide.on('message', function(data) {
                    if (self.state == 'connecting') {
                        self.state = 'transfer';
                        console.log(pipe.id + ": is connected to server side.");
                    }

                    pipe.sendToClient(data);
                });
            },

            sendToServer: function(data) {
                if (this.serverSide) {
                    this.serverSide.send(data);
                }
            },

            sendToClient: function(data) {
                if (this.clientSide) {
                    this.clientSide.write(data);
                }
            },

            authenticate: function(data) {
                var tempBuf = new Buffer(2);
                tempBuf.write("\u0005\u0000", 0);
                this.sendToClient(tempBuf);
                this.state = 'auth';
                console.log(this.id + ": is authenticated");
            },

            remoteConnect: function(data) {
                this.state = 'connecting';
                this.sendToServer(data);
            },

            destroy: function() {
                if (this.state != 'closed') {
                    this.state = 'closed';

                    this.serverSide.disconnect();
                    this.serverSide = null;

                    if (this.clientSide) {
                        this.clientSide.destroy();
                        this.clientSide = null;
                    } else {
                        console.log(this.id + ": clientSide is null");
                    }

                    console.log('destroy pipe: ' + this.id);
                }
            }
        };

        pipe.clientSide.on("data", function(data) {
            if (pipe.state == 'init') {
                console.log(pipe.id + ": is authenticating...");
                pipe.authenticate(data);
            } else if (pipe.state == 'auth') {
                console.log(pipe.id + ": is connecting to server side...");
                pipe.remoteConnect(data);
            } else if (pipe.state == 'transfer'){
                pipe.sendToServer(data);
            }
        });

        console.log('create pipe: ' + pipe.id);
        return pipe;
    }

}).call(this);
