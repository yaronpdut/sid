var config = require('config')
    , fs = require('fs')
    , Datastore = require('nedb') // https://github.com/louischatriot/nedb
    ,util = require('util');

function getTimeStamp() {
    var now = new Date();
    return ((now.getMonth() + 1) + '/' +
    (now.getDate()) + '/' +
    now.getFullYear() + " " +
    now.getHours() + ':' +
    ((now.getMinutes() < 10)
        ? ("0" + now.getMinutes())
        : (now.getMinutes())) + ':' +
    ((now.getSeconds() < 10)
        ? ("0" + now.getSeconds())
        : (now.getSeconds())) + " :" );
}

function getTimeStampTime() {
    var now = new Date();
    return (now.getHours() + ':' +
    ((now.getMinutes() < 10)
        ? ("0" + now.getMinutes())
        : (now.getMinutes())) + ':' +
    ((now.getSeconds() < 10)
        ? ("0" + now.getSeconds())
        : (now.getSeconds()))
    + ' ' + now.getMilliseconds()
    );


}

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


cfgGetDbHandle = function (name) {
    return db_file_handles[db_names.indexOf(name)];
}


function pad(width, string, padding) {
    return (width <= string.length) ? string : pad(width, padding + string, padding)
}

var padRight = function(inputstring, length, padding)
{
    var i;
    var s =  inputstring;
    for(i = 0; i < (length - inputstring.length); i++)
        s += padding;
    return s;
}

var getLogHeader = function(serviceName, sevirity)
{
    return util.format("[%s][%s][%s] "
        , padRight(getTimeStampTime().toString(), 12, ' ')
        , padRight(serviceName.toString(), 7, ' ')
        , padRight(sevirity.toString(), 5, ' '));
}

// parameters:
//  Module
//  Message

var logInfo = function()
{
    console.log(getLogHeader(arguments[0], 'INFO ') + arguments[1]);
}

var logError = function()
{
    console.log(getLogHeader(arguments[0], 'ERROR')+arguments[1]);
}

var getNumOfNominates = function()
{
    return 5;
}

module.exports.getNumOfNominates =getNumOfNominates;
module.exports.getLogHeader = getLogHeader;
module.exports.logInfo = logInfo;
module.exports.logError = logError;
module.exports.cfgGetRoundNumber = cfgGetRoundNumber;
module.exports.cfgGetDbHandle = cfgGetDbHandle;
module.exports.getTimeStamp = getTimeStamp;




