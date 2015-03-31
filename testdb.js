// JavaScript source code

var bunyan = require('bunyan');
var log = bunyan.createLogger(
	{ 
	name: "SID REST" 
	}
   );

log.info("hi");


var Datastore = require('nedb'), // https://github.com/louischatriot/nedb
    db = new Datastore(
        {
            filename: 'projects.json',
            autoload: true
        }
    );


var bunit = "mcr";
var exclude_prj_code = "1";


db.findOne({ $and: [{ bu: bunit }, { project_code: { $ne: exclude_prj_code } }] },
    function (err, docs)
    {
        log.info("err=%j record=%j", err == undefined ? "no" : "yes", docs);
    }
    );




