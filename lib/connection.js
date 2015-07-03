var io = require('socket.io-client');
var Session = require('./session');
var uuid = require('uuid');

var Connection = function(url) {
    this.url = url;
    this.socket = io(url, {forceNew: true});
    this.sessions = {};
};

Connection.prototype.createSession = function(callback) {
    var self = this;

    this.socket.send(uuid.v4(), function(id) {
        console.log('creating session...');
        var newSocket = io(self.url + "/" + id);
        var session = new Session(id, newSocket);
        self.sessions[id] = session;

        session.on('close', function() {
            delete self.sessions[id];
            console.log(id + ' session is closed, left ' + Object.keys(self.sessions).length)
        });

        callback(session);
        console.log(id + " session is created, total " + Object.keys(self.sessions).length);
    });

}

Connection.prototype.getSessionCount = function() {
    return Object.keys(this.sessions).length;
}

module.exports = Connection;