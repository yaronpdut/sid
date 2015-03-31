// JavaScript source code


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
        console.log("err=%j record=%j", err == undefined ? "no" : "yes", docs);
    }
    );




