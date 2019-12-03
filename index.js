"use strict";

var util = require('util');
var crypto = require('crypto');
var PAYTM_MERCHANT_KEY = "qZ!pZtx_fIeMBeVe";


var crypt = {
    iv: '@@@@&&&&####$$$$',

    encrypt: function (data, custom_key) {
        var iv = this.iv;
        var key = custom_key;
        var algo = '256';
        switch (key.length) {
            case 16:
                algo = '128';
                break;
            case 24:
                algo = '192';
                break;
            case 32:
                algo = '256';
                break;

        }
        var cipher = crypto.createCipheriv('AES-' + algo + '-CBC', key, iv);
        //var cipher = crypto.createCipher('aes256',key);
        var encrypted = cipher.update(data, 'binary', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    },

    decrypt: function (data, custom_key) {
        var iv = this.iv;
        var key = custom_key;
        var algo = '256';
        switch (key.length) {
            case 16:
                algo = '128';
                break;
            case 24:
                algo = '192';
                break;
            case 32:
                algo = '256';
                break;
        }
        var decipher = crypto.createDecipheriv('AES-' + algo + '-CBC', key, iv);
        var decrypted = decipher.update(data, 'base64', 'binary');
        try {
            decrypted += decipher.final('binary');
        } catch (e) {
            util.log(util.inspect(e));
        }
        return decrypted;
    },

    gen_salt: function (length, cb) {
        crypto.randomBytes((length * 3.0) / 4.0, function (err, buf) {
            var salt;
            if (!err) {
                salt = buf.toString("base64");
            }
            //salt=Math.floor(Math.random()*8999)+1000;
            cb(err, salt);
        });
    },

    /* one way md5 hash with salt */
    md5sum: function (salt, data) {
        return crypto.createHash('md5').update(salt + data).digest('hex');
    },
    sha256sum: function (salt, data) {
        return crypto.createHash('sha256').update(data + salt).digest('hex');
    }
};

//   (function () {
//     var i;

//     function logsalt(err, salt) {
//       if (!err) {
//         console.log('salt is ' + salt);
//       }
//     }

//     if (require.main === module) {
//       var enc = crypt.encrypt('One97');
//       console.log('encrypted - ' + enc);
//       console.log('decrypted - ' + crypt.decrypt(enc));

//       for (i = 0; i < 5; i++) {
//         crypt.gen_salt(4, logsalt);
//       }
//     }

//   }());


//mandatory flag: when it set, only mandatory parameters are added to checksum

function paramsToString(params, mandatoryflag) {
    var data = '';
    var tempKeys = Object.keys(params);
    tempKeys.sort();
    tempKeys.forEach(function (key) {
        var n = params[key].includes("REFUND");
        var m = params[key].includes("|");
        if (n == true) {
            params[key] = "";
        }
        if (m == true) {
            params[key] = "";
        }
        if (key !== 'CHECKSUMHASH') {
            if (params[key] === 'null') params[key] = '';
            if (!mandatoryflag || mandatoryParams.indexOf(key) !== -1) {
                data += (params[key] + '|');
            }
        }
    });
    return data;
}


function genchecksum(params, key, cb) {
    var data = paramsToString(params);
    crypt.gen_salt(4, function (err, salt) {
        var sha256 = crypto.createHash('sha256').update(data + salt).digest('hex');
        var check_sum = sha256 + salt;
        var encrypted = crypt.encrypt(check_sum, key);
        cb(undefined, encrypted);
    });
}

function genchecksumbystring(params, key, cb) {

    crypt.gen_salt(4, function (err, salt) {
        var sha256 = crypto.createHash('sha256').update(params + '|' + salt).digest('hex');
        var check_sum = sha256 + salt;
        var encrypted = crypt.encrypt(check_sum, key);

        var CHECKSUMHASH = encodeURIComponent(encrypted);
        CHECKSUMHASH = encrypted;
        cb(undefined, CHECKSUMHASH);
    });
}

function verifychecksum(params, key, checksumhash) {
    var data = paramsToString(params, false);

    //TODO: after PG fix on thier side remove below two lines
    if (typeof checksumhash !== "undefined") {
        checksumhash = checksumhash.replace('\n', '');
        checksumhash = checksumhash.replace('\r', '');
        var temp = decodeURIComponent(checksumhash);
        var checksum = crypt.decrypt(temp, key);
        var salt = checksum.substr(checksum.length - 4);
        var sha256 = checksum.substr(0, checksum.length - 4);
        var hash = crypto.createHash('sha256').update(data + salt).digest('hex');
        if (hash === sha256) {
            return true;
        } else {
            util.log("checksum is wrong");
            return false;
        }
    } else {
        util.log("checksum not found");
        return false;
    }
}

function verifychecksumbystring(params, key, checksumhash) {

    var checksum = crypt.decrypt(checksumhash, key);
    var salt = checksum.substr(checksum.length - 4);
    var sha256 = checksum.substr(0, checksum.length - 4);
    var hash = crypto.createHash('sha256').update(params + '|' + salt).digest('hex');
    if (hash === sha256) {
        return true;
    } else {
        util.log("checksum is wrong");
        return false;
    }
}

function genchecksumforrefund(params, key, cb) {
    var data = paramsToStringrefund(params);
    crypt.gen_salt(4, function (err, salt) {
        var sha256 = crypto.createHash('sha256').update(data + salt).digest('hex');
        var check_sum = sha256 + salt;
        var encrypted = crypt.encrypt(check_sum, key);
        params.CHECKSUM = encodeURIComponent(encrypted);
        cb(undefined, params);
    });
}

function paramsToStringrefund(params, mandatoryflag) {
    var data = '';
    var tempKeys = Object.keys(params);
    tempKeys.sort();
    tempKeys.forEach(function (key) {
        var m = params[key].includes("|");
        if (m == true) {
            params[key] = "";
        }
        if (key !== 'CHECKSUMHASH') {
            if (params[key] === 'null') params[key] = '';
            if (!mandatoryflag || mandatoryParams.indexOf(key) !== -1) {
                data += (params[key] + '|');
            }
        }
    });
    return data;
}

exports.generateChecksum = (req,res) => {

    genchecksum(req.body, PAYTM_MERCHANT_KEY, function (err, checksum) {
        console.log('Checksum: ', checksum, "\n");
        //res.writeHead(200, {'Content-type' : 'text/json','Cache-Control': 'no-cache'});
        //res.send({data:checksum});
        //res.write(JSON.stringify({data:checksum}));
        console.log(checksum)
        res.write(checksum);
        res.end();
     
    });
};
