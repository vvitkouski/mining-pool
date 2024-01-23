const base58 = require('base58-native');
const constants = require('./constants');

exports.packInt64LE = function(num){
    var buff = Buffer.alloc(8);
    buff.writeUInt32LE(num % Math.pow(2, 32), 0);
    buff.writeUInt32LE(Math.floor(num / Math.pow(2, 32)), 4);
    return buff;
};

var magnitude = 1000000000000000000;
var precision = 18;

exports.toALPH = function(amount){
    return parseFloat((amount / magnitude).toFixed(precision));
};

exports.fromALPH = function(coins){
    return Math.floor(coins * magnitude);
};

function djbHash(buffer){
    var hash = 5381;
    for (var idx = 0; idx < buffer.length; idx++){
        hash = (((hash << 5) + hash) + (buffer[idx] & 0xff)) & 0xffffffff;
    }
    return hash;
}

function xorByte(intValue){
    var byte0 = (intValue >> 24) & 0xff;
    var byte1 = (intValue >> 16) & 0xff;
    var byte2 = (intValue >> 8) & 0xff;
    var byte3 = intValue & 0xff;
    return (byte0 ^ byte1 ^ byte2 ^ byte3) & 0xff;
}

function groupOfAddress(addressStr){
    var decoded = null;
    try {
        decoded = base58.decode(addressStr);
    } catch (error){
        return [null, 'invalid P2PKH address format'];
    }
    if (decoded.length != 33){ // prefix(1 byte) + public key hash(32 bytes)
        return [null, 'incorrect P2PKH address size'];
    }

    if (decoded[0] != 0x00){ // prefix for P2PKH
        return [null, 'invalid P2PKH address'];
    }

    var hint = djbHash(decoded.slice(1)) | 1;
    var hash = xorByte(hint);
    var group = hash % constants.GroupSize;
    return [group, null];
}

exports.isValidAddress = function(addressStr, group){
    var [g, error] = groupOfAddress(addressStr);
    if (error){
        return [false, error];
    }
    return [g == group, null];
}

exports.groupOfAddress = groupOfAddress;

function executeForEach(array, func, callback){
    if (array.length === 0){
        callback();
        return;
    }
    var element = array.shift();
    func(element, function(){
        executeForEach(array, func, callback);
    });
}

exports.executeForEach = executeForEach;

function blockChainIndex(hash){
    var beforeLast = hash[hash.length - 2] & 0xff;
    var last = hash[hash.length -1] & 0xff;
    var bigIndex = beforeLast << 8 | last;
    var chainNum = constants.GroupSize * constants.GroupSize;
    var index = bigIndex % chainNum;
    var fromGroup = Math.floor(index / constants.GroupSize);
    var toGroup = index % constants.GroupSize;
    return [fromGroup, toGroup];
}

exports.blockChainIndex = blockChainIndex;
