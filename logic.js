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

var getProjectMembers = function (proj_code, callback)
{
    var dbb = cfg.cfgGetDbHandle('voters');
    dbb.find({project: proj_code}, function (err, docs)
    {
        if (docs) {
            callback(true, docs);
        }
        else {
            callback(false);
        }
    });

}


var getProjectDetails = function (proj_code, callback) {
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

var dbCheckIfUserCanVote4Project = function (user, project, callback)
{
    // get project record

    var dbb;

    switch(cfg.cfgGetRoundNumber())
    {
        case 1 :
            // user cannot vote to its own project
            if (user.project != null && user.project == project)
            {
                console.log("|logic| Error: User can not vote to a project associated with");
                callback(true, {reason: "Error: User can not vote to a project associated with"});
                return;
            }

            // find the project
            dbb = cfg.cfgGetDbHandle('projects');
            dbb.find({"project_code": project}, function (err, docs) {
                if (docs.length == 0) {
                    console.log("|logic| Error: Invalid Project Id");
                    callback(true, {reason: "Error: Invalid Project Id. Project code not found"});
                    return;
                }

                if (user.voted != '') {
                    console.log("|logic| Error: User already voted");
                    callback(true, {reason: "Error: User already voted"});

                }
                // verify user and project are from the same BU
                if (user.bu != docs[0].bu) {
                    console.log("|logic| Error: User cannot vote to a project not in its own BU");
                    callback(true, {reason: "Error: User cannot vote to a project not in its own BU"});
                }
                else {
                    console.log(false);
                    callback(false);
                }
            });
            break;
        case 2:
            // find the project in final projects
            dbb = cfg.cfgGetDbHandle('finals');
            dbb.find({"project_code": project}, function (err, docs)
            {
                if (docs.length == 0) {
                    console.log("|logic| Error: Invalid Project Id");
                    callback(true, {reason: "Error: Invalid Project Id. Project code not found"});
                    return;
                }
            });
                break;
    }
}

var doVote = function (username, token, project, callback)
{
    console.log("|logic| do vote: %s %s %s ", username, token, project);

    // retrieve user record first
    dbGetUserRecord(username, function (user)
    {
        if (!user || user.emp_number != token) {
            console.log("|logic| Invalid user name or token");
            callback('{ result: "Error: Invalid user name or token" }');
            return;
        }

        dbCheckIfUserCanVote4Project(user, project, function (err, reason)
        {
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
module.exports.findVoter = findVoter;
module.exports.getVotes = getVotes;
module.exports.getProjects = getProjects;
module.exports.getBuProjects = getBuProjects;
module.exports.doVote = doVote;
module.exports.getProjectDetails = getProjectDetails;
module.exports.dbGetFinalProjectToVote = dbGetFinalProjectToVote;
module.exports.getProjectMembers = getProjectMembers;


