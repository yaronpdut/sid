var config = require('config')
    , fs = require('fs')
    , Datastore = require('nedb') // https://github.com/louischatriot/nedb
    ;

/***
 * Get Round Number
 * @return {number}
 */
var cfgGetRoundNumber = function () {
        return 1;
        var voting = config.get('Voting');
        var d = new Date();

        var Start, End, current;

        Start = new Date(Date.parse(voting.Round == 1 ? voting.Round1.Start : voting.Round2.Start));
        End = new Date(Date.parse(voting.Round == 1 ? voting.Round1.End : voting.Round2.End));
        current = d.getTime().valueOf();
        console.log(Start);
        if (((current - Start.valueOf()) > 0) && ((End.valueOf() - current) > 0)) {
            return 1;
        }
        else {
            return 0;

        }
    };

/**
 * try to find database base directory relatively to calling script (or process) position.
 * @param cb callback with value argument for dir location
 */
cfgGetDbRootDir = function (cb) {
    var basePath = process.cwd();
    var potentialDir = [
        basePath + "/",
        basePath + "/models/",
        basePath + "/../models/"
    ];
    potentialDir.forEach(function (value, idx) {
        fs.exists(value + 'voters.json', function (ex) {
            if (ex)
                cb(potentialDir[idx]);
        });
    })

}

var db_file_names = ["voters.json", "projects.json", "finals.json"],
    db_names = ['voters', 'projects', 'finals']
db_file_handles = [];


cfgOpenDb = function () {
    cfgGetDbRootDir(function (baseDirectoryName) {
        console.log('|configuration| opening database. base dir: %s ', baseDirectoryName);
        var d = baseDirectoryName;
        db_file_names.forEach(function (dbFileName) {
            console.log('|configuration| opening file %s', dbFileName);
            db_file_handles.push(new Datastore({filename: d + dbFileName, autoload: true}));
        })
    });
};

cfgGetDbHandle = function (name) {
    return db_file_handles[db_names.indexOf(name)];
}

module.exports.cfgGetRoundNumber = cfgGetRoundNumber;
module.exports.cfgGetDbRootDir = cfgGetDbRootDir;
module.exports.cfgOpenDb = cfgOpenDb;
module.exports.cfgGetDbHandle = cfgGetDbHandle;




