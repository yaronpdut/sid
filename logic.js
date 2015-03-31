var Datastore = require('nedb'), // https://github.com/louischatriot/nedb
    cfg = require("./configmgr");

/**
 * Look for specific user in database
 * @param userName
 * @param callback
 */

var findVoter = function (userName, callback) {
    var dbb = cfg.cfgGetDbHandle('voters');
    dbb.findOne({userName: userName}, function (err, docs) {
        console.log("|log| looking for voter %s found=%j docs=%j", userName, err, docs);
        if (docs) {
            callback(true, docs);
        }
        else {
            callback(false);
        }
    });

}

var isProjectExist = function (proj_code, callback) {
    var dbb = cfg.cfgGetDbHandle('projects');
    dbb.findOne({project_code: proj_code}, function (err, docs) {
        console.log("|log| looking for project %s found=%j record=%j", proj_code, err, docs);
        callback(docs);
    });
}



/**
 * return list of projects user can vote, from its bu, excluding the project he assign to.
 * 
 **/

var getBuProjects = function (userid, bunit, callback) 
{
    var dbb = cfg.cfgGetDbHandle('projects');
    
    // get user record
    findVoter(userid, function (err, user_rec) {
        // limit the projects
        dbb.find({ $and: [{ bu: bunit }, { project_code: { $ne: user_rec.project } }] },
        function (err, docs) {
            callback(docs);
        });
    
    });


}


var getProjects = function (exclude_prj_code, callback) {
    var dbb = cfg.cfgGetDbHandle('projects');
    dbb.find({project_code: {$ne: exclude_prj_code}}, function (err, docs) {
        callback(docs);
    });

}


var getVotes = function (callback, bunit) {
    var dbb = cfg.cfgGetDbHandle('voters');

    var findString =
        bunit == undefined ? {}
            : {bu: bunit};

    dbb.find(findString, function (err, docs) {
        var results = [];
        for (var i = 0, len = docs.length; i < len; i++) {
            if (docs[i].voted != undefined && docs[i].voted != "") {
                console.log(docs[i].voted);
                if (results[docs[i].voted] == undefined)
                    results[docs[i].voted] = 1;
                else
                    results[docs[i].voted] += 1;
            }
        }
        console.log(results);
        callback(results);

    })
}


var dbGetUserRecord = function (username, callback) {
    var dbb = cfg.cfgGetDbHandle('voters');
    dbb.findOne({userName: username}, function (err, docs) {
        callback(docs);
    });

}

var updateUserRecWithVote = function (user, voted_project, callback) {
    var dbb = cfg.cfgGetDbHandle('voters');
    // user.voted = voted_project;
    console.log(JSON.stringify(user));
    dbb.update(
        user,
        {$set: {voted: voted_project}},
        {},
        function (err, numReplaced) {
            if (err) console.log("UPDATE: " + err);
            else console.log("UPDATE numReplaced: " + numReplaced);
            callback(err)
        });
}

var dbCheckIfUserCanVote4Project = function (user, project, callback) {
    // get project record

    console.log("dbCheckIfUserCanVote4Project:");
    console.log("user.project = " + user.project);
    console.log("project = " + project);

    // user cannot vote to its own project
    if (user.project != null && user.project == project) {
        console.log("Error: User can not vote to a project associated with");
        callback(true, {reason: "Error: User can not vote to a project associated with"});
        return;
    }

    // find the project
    var dbb = cfg.cfgGetDbHandle('projects');
    dbb.find({"project_code": project}, function (err, docs) {
        console.log("Looking for project in DB: " + JSON.stringify(docs));
        if (docs.length == 0) {
            console.log("Error: Invalid Project Id");
            callback(true, {reason: "Error: Invalid Project Id "});
            return;
        }

        // verify user and project are from the same BU
        console.log("user.bu ", user.bu);
        console.log("docs.bu", docs[0].bu);
        if (user.bu != docs[0].bu) {
            console.log("Error: User cannot vote to a project not in its own BU");
            callback(true, {reason: "Error: User cannot vote to a project not in its own BU"});
        }
        else {
            console.log(false);
            callback(false);
        }

    });

}

var doVote = function (username, token, project, callback) {
    console.log("|logic| do vote: %s %s %s ", username, token, project);
    dbGetUserRecord(username, function (user) {
        if (!user || user.emp_number != token) {
            console.log("invalid user name or token");
            callback('{ result: "Error: invalid user name or token" }');
            return;
        }

        console.log("dbCheckIfUserCanVote4Project");
        dbCheckIfUserCanVote4Project(user, project, function (err, reason) {

            if (err == false) {
                console.log("updateUserRecWithVote");
                updateUserRecWithVote(user, project, function (err) {
                    console.log(err);
                    callback('{ result: "OK" }');
                })

            }
            else {
                callback(reason);
            }

        });


    });

    // @TODO: verify user can vote for this project: - same bu for first vote -
    // @TODO: verify user is not assoc with project
    // @TODO: perform voting (update record)

}

var dbGetFinalProjectToVote = function (callback) {

    var dbb = cfg.cfgGetDbHandle('finals');

    dbb.find({}, function (err, docs) {
        callback(docs);
    });

}
// U N I T   T E S T I N G


module.exports.findVoter = findVoter;
module.exports.getVotes = getVotes;
module.exports.getProjects = getProjects;
module.exports.getBuProjects = getBuProjects;
module.exports.doVote = doVote;
module.exports.isProjectExist = isProjectExist;
module.exports.dbGetFinalProjectToVote = dbGetFinalProjectToVote;

console.log(">>>>>>>>>>>>>>>>>>>>>>> UNIT TESTS <<<<<<<<<<<<<<<<<<<<<<<<");

var async = require('async');

var fillDatabaseWithDummies = function () {
    processProjects(function (dbb) {
        var p;
        for (var i = 1; i < 200; i++) {
            p = {
                project_code: i.toString(),
                project_name: "My Project" + i.toString(),
                description: "This is my project" + i.toString()
            }
            dbb.insert(p);
        }

    });

    setTimeout(function () {
        processVoters(function (dbb) {
            for (var i = 1; i < 1800; i++) {
                var e = (i * 100);
                var p = {
                    userName: "yaron.pdut@nice.com"
                    , emp_number: e.toString()
                    , site: "raanana"
                    , bu: "mcr"
                    , project: (Math.floor((Math.random() * 200) + 1)).toString()
                    , voted: ""
                    , final_vote: ""
                };
                dbb.insert(p);
            }
        });
    }, 3000);

}

var unitTest = function () {
// fillDatabaseWithDummies();

    async.waterfall([
        function (cb) {
            findVoter("yaron.pdut1@nice.com", function (ok, ddoc) {
                console.log(JSON.stringify(ddoc));
                return cb()
            });
        }
        , function (cb) {
            findVoter("yaron.pdut3@nice.com", function (ok, ddoc) {
                console.log(JSON.stringify(ddoc));
                return cb()
            });
        }
        , function (cb) {
            findVoter("pdut3@nice.com", function (ok, ddoc) {
                if (ddoc)
                    console.log(JSON.stringify(ddoc));
                else
                    console.log("Not found");
                return cb()
            });
        }

        , function (cb) {
            getProjects("2", function (ok, list) {
                if (ok)
                    console.log(JSON.stringify(list));
                return cb();
            });

        }

    ], function () {
    });

    getVotes(function (r) {
        ;
        console.log(r);
    })


    console.log("*********************************");
    isProjectExist("60", function (c) {
        console.log("*********************************");
        console.log("60->" + c);
    })
    console.log("*********************************");
    isProjectExist("91", function (c) {
        console.log("*********************************");
        console.log("91->" + c);

    })
    console.log("*********************************");
    isProjectExist("182", function (c) {
        console.log("*********************************");
        console.log("182->" + c);

    })

}

