var crypto = require('crypto');

var Encryptor = function(algorithm, password) {
    this.algorithm = algorithm;
    this.password = password;
};

Encryptor.prototype.encrypt = function(buffer) {
    var cipher = crypto.createCipher(this.algorithm, this.password)
    var crypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    return crypted;
}

Encryptor.prototype.decrypt = function(buffer) {
    var decipher = crypto.createDecipher(this.algorithm, this.password)
    var dec = Buffer.concat([decipher.update(buffer) , decipher.final()]);

    return dec;
}

module.exports = Encryptor;