var Promise = require('bluebird');
var data = require('./data.json');

module.exports = {
    searchId: function (obj) {
        var id = obj.id.toString()
        var job;
        return new Promise(function (resolve, reject) {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    job = data[key] 
                    if(job.AuftragNr === id) {
                        resolve(job)
                    } 
                }
            }
            reject(id)
        });
    }
};


