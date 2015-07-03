var fs = require('fs');
var net = require('net');
var config = JSON.parse(fs.readFileSync('config.json'));
var ConnectionPool = require('./lib/connection-pool');

var serverUrl = 'http://' + config.serverAddress + ':' + config.serverPort;
var connectionPool = new ConnectionPool(serverUrl);

var localServer = net.createServer(function(socket) {
    var sessionCreated = false;
    var cache = [];

    socket.on('data', function(data) {
        if (!sessionCreated) {
            cache.push(data);
        } else if (cache) {
            cache == null;
        }
    });

    socket.on('error', function(e) {
        console.log('client side connection error: ' + e);
        socket.destroy();
    });

    connectionPool.getConnection().createSession(function(session) {
        session.on('message', function(data){
            socket.write(data);
        });

        session.on('close', function(){
            socket.end();
        });

        socket.on('close', function(){
            session.close();
        });

        socket.on('data', function(data) {
            processData(data);
        });

        while (cache && cache.length) {
            processData(cache.shift());
        }

        function processData(data) {
            console.log('process data :' + data.length);
            if (session.state == 'init') {
                console.log(session.id + ": is authenticating...");
                session.authenticate(data, function(result){
                    socket.write(result);
                });
            } else if (session.state == 'auth') {
                console.log(session.id + ": is connecting to server side...");
                session.remoteConnect(data, function(result) {
                    socket.write(result);
                    console.log('remote connect result: ' + result);
                });
            } else if (session.state == 'transfer'){
                session.send(data);
            }
        }

        sessionCreated = true;
    });

});

localServer.listen(config.clientPort, config.clientAddress, function() {
    var address = localServer.address();
    return console.log('local server listening at', address);
});

localServer.on('error', function(e) {
    if (e.code === 'EADDRINUSE') {
      console.log('address in use, aborting');
    }
    return process.exit(1);
});