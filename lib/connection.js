var io = require('socket.io-client');
var Session = require('./session');
var uuid = require('uuid');

var Connection = function(id, url) {
    this.id = id;
    this.url = url;
    this.manager = new io.Manager(url);
    this.socket = this.manager.socket("/");
    this.sessions = {};
};

Connection.prototype.createSession = function(callback) {
    var self = this;

    this.socket.send(uuid.v4(), function(id) {
        console.log('creating session...');
        var newSocket = self.manager.socket("/" + id);
        var session = new Session(id, newSocket);
        self.sessions[id] = session;

        session.on('close', function() {
            delete self.sessions[id];
            console.log('connection#' + self.id + ': session(' + id +') is closed, left ' + Object.keys(self.sessions).length)
        });

        callback(session);
        console.log('connection#' + self.id + ': session(' + id +') is created, total ' + Object.keys(self.sessions).length);
    });

}

Connection.prototype.getSessionCount = function() {
    return Object.keys(this.sessions).length;
}

module.exports = Connection;