var Connection = require('./connection');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json'));
var atomInt = 1;

var ConnectionPool = function(url) {
    this.size = config.connectionPoolSize;
    this.connections = [];

    for(var i = 0; i < this.size; i++) {
        this.connections.push(new Connection(atomInt++, url));
    }

    console.log('connection pool is ready, size:' + this.connections.length);
};

ConnectionPool.prototype.getConnection = function() {
    var suitable = null;
    for(var i in this.connections) {
        var connection = this.connections[i];
        if (suitable == null ||
            suitable.getSessionCount() > connection.getSessionCount()) {
            suitable = connection;
        }
    }


    return suitable;
}

module.exports = ConnectionPool;