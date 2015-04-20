var MongoClient = require('mongodb').MongoClient;
var MongoServerUrl;
var cfg     = require('./configmgr');

// check operating environment for MongoDB connection string
if (process.env.OPENSHIFT_NODEJS_IP === undefined) {
    MongoServerUrl = 'mongodb://:localhost/test';
}
else {
    MongoServerUrl = 'mongodb://admin:NHigCk3xNWdf@127.9.4.2:27017/nsdv';
}

console.log(cfg.getTimeStamp()," MongoDB |info| Database Path = ", MongoServerUrl);


var ConnectAndExec = function (callback) {
    MongoClient.connect(MongoServerUrl, function (err, db) {
        callback(db);
    });
};

var doFindOne = function (collectionName, Query, Callback) {
    ConnectAndExec(function (db) {
        var collection = db.collection(collectionName);
        collection.findOne(Query, function (err, item) {
            Callback(err, item);
            db.close();
        });
    });
};

var doFind = function (collectionName, Query, Callback) {
    ConnectAndExec(function (db) {
        var collection = db.collection(collectionName);
        collection.find(Query).toArray(
            function (err, docs) {
                Callback(err, docs);
                db.close();
            });
    });
};


var findVoter = function (theUserName, callback) {

    var query = { userName: new RegExp(theUserName, "i") };
    doFindOne("voters", query, function (err, item) {
        console.log(cfg.getTimeStamp()," findVoter |info| "
            ,"looking for voter ", theUserName);

        if(item)
            callback(err, item);
        else {
            query = { email: new RegExp(theUserName, "i") };
            doFindOne("voters", query, function (err, item) {
                callback(err, item);
            });
        }
    });

};

var getProjectMembers = function (proj_code, callback) {
    doFind("voters", {project: proj_code}, function (err, docs) {
        if (docs) {
            callback(true, docs);
        }
        else {
            callback(false);
        }
    });
};

var getProjectDetails = function (proj_code, callback) {
    doFindOne("projects", {project_code: proj_code}, function (err, item) {
        console.log(cfg.getTimeStamp()," findVoter |info| ",
            "looking for project", proj_code, " found=", err, "record=",  item);
        callback(item);
    });
};

var dbGetAllProjects = function (callback) {
    doFind("projects", {}, function (err, item) {
        callback(item);
    });
};


var dbGetProjects = function (userid, filterName, value, callback) {
    // get user record
    findVoter(userid, function (err, user_rec) {
        // limit the projects

        switch(filterName) {
            case "name"     :
                doFind("projects", { project_code: value }, {}, function (err, docs) {
                    callback(err, docs);
                });
                break;
            case "bu"       :
                doFind("projects", { bu : value }, {}, function (err, docs) {
                    callback(err, docs);
                });
                break;
        }

    });
};


/**
 * return list of projects user can vote, from its bu, excluding the project he assign to.
 *
 **/

var getBuProjects = function (userid, bunit, callback) {
    // get user record
    findVoter(userid, function (err, user_rec) {
        // limit the projects

        doFind("projects", {$and: [{bu: bunit}, {project_code: {$ne: user_rec.project}}]}, function (err, docs) {
            callback(err, docs);
        });

    });
};

var getBuProjectsEx = function (excludeprj, bunit, callback) {
    // get user record
    if(bunit == "ALL")
    {
        doFind("projects", { project_code: { $ne: excludeprj}},
            function (err, docs) {
                callback(err, docs);
            });

    }
    else {
        doFind("projects", {$and: [{bu: bunit}, {project_code: {$ne: excludeprj}}]}, function (err, docs) {
            callback(err, docs);
        });
    }
};

var getProjects = function (exclude_prj_code, callback) {
    doFind("projects", {project_code: {$ne: exclude_prj_code}}, function (err, docs) {
        callback(err, docs);
    });
};

var getVotes = function (callback, bunit) {

    var findString =
        bunit == undefined ? {}
            : {bu: bunit};

    doFind('voters', findString, function (err, docs) {
        var results = [];
        for (var i = 0, len = docs.length; i < len; i++) {
            if (docs[i].voted != undefined && docs[i].voted != "") {
                // console.log(docs[i].voted);
                if (results[docs[i].voted] == undefined)
                    results[docs[i].voted] = 1;
                else
                    results[docs[i].voted] += 1;
            }
        }
        console.log(cfg.getTimeStamp()," getVotes |info| ",results);
        callback(results);

    });
};


var dbGetUserRecord = function (username, callback) {
    doFindOne('voters', {userName: username}, function (err, docs) {
        callback(docs);
    });

};

var updateUserRecWithVote = function (user, voted_project, callback) {
    console.log(cfg.getTimeStamp()," updateUserRecWithVote |info| updating vote record for ",user);

    ConnectAndExec(function (db) {
        var collection = db.collection('voters');

        collection.updateOne(
            user,
            {$set: {voted: voted_project}},
            {},
            function (err, numReplaced) {
                if (err)
                    console.error(cfg.getTimeStamp()," updateUserRecWithVote |error| ",err);

                else
                    console.error(cfg.getTimeStamp()," updateUserRecWithVote |info| numReplaced:",numReplaced);
                callback(err)
            });
    });
};

var dbCheckIfUserCanVote4Project = function (user, project, callback) {
    // get project record

    switch (cfg.cfgGetRoundNumber()) {
        case 1 : // user cannot vote to its own project
            if (user.project != null && user.project == project) {
                console.error(cfg.getTimeStamp()," dbCheckIfUserCanVote4Project |error| User can not vote to a project associated with ",user);
                callback(true, {error: 1, reason: "Error: User can not vote to a project associated with"});
                return;
            }

            // find the project
            doFind('projects', {"project_code": project}, function (err, docs) {
                if (docs.length == 0) {
                    console.error(cfg.getTimeStamp()," dbCheckIfUserCanVote4Project |error| Invalid Project Id ", project);
                    callback(true, {error: 2, reason: "Error: Invalid Project Id. Project code not found"});
                    return;
                }

                if (user.voted != '') {
                    console.error(cfg.getTimeStamp()," dbCheckIfUserCanVote4Project |error| User already voted ", user.UserName);
                    callback(true, {error: 3, reason: "Error: User already voted"});
                    return;

                }
                // verify user and project are from the same BU
                if (user.bu != "ALL" && user.bu != docs[0].bu) {
                    console.error(cfg.getTimeStamp()," dbCheckIfUserCanVote4Project |error| User cannot vote to a project not in its own BU ", user);
                    callback(true, {error: 4, reason: "Error: User cannot vote to a project not in its own BU"});
                    return;
                }
                else {
                    callback(false);
                    return;
                }
            });
            break;
        case 2: // find the project in final projects
            doFind('finals', {"project_code": project}, function (err, docs) {
                if (docs.length == 0) {
                    console.error(cfg.getTimeStamp()," dbCheckIfUserCanVote4Project |error| Invalid Project Id ", project);
                    callback(true, {error: 5, reason: "Error: Invalid Project Id. Project code not found"});
                    return;
                }
            });
            break;
    }
};

var doVote = function (username, token, project, callback) {
    console.log(cfg.getTimeStamp()," doVote |info| ", username, token, project);
    // retrieve user record first
    dbGetUserRecord(username, function (user) {
        if (!user || user.emp_number != token) {
            console.error(cfg.getTimeStamp()," doVote |error| Invalid user name or token", username, token, project);
            callback({ error: 6, result: "Error: Invalid user name or token" });
            return;
        }

        dbCheckIfUserCanVote4Project(user, project, function (err, reason) {
            if (err == false) {
                updateUserRecWithVote(user, project, function (err) {
                    callback({ error: 0, result: "OK" });
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

};

var dbGetFinalProjectToVote = function (callback) {
    doFind('finals', {}, function (err, docs) {
        callback(docs);
    });
};

var dbResetVotes = function (callback) {
    ConnectAndExec(function (db)
    {
        var collection = db.collection('voters');

        collection.update(
            {},
            {$set: {voted: ""} },
            {upsert: true, multi: true},
            function (err, numReplaced) {
                if (err) {
                    console.log(cfg.getTimeStamp()," dbResetVotes |error| ");
                }
                else {
                    console.log(cfg.getTimeStamp()," dbResetVotes |info| Number of updated records= ", numReplaced.n);
                }
                callback(err)
            });
    });
};

var dbAddProjectdetails2Votes = function(results, callback)
{
    var i = 0;
    (function insertOne() {

// *******************************************

        doFindOne("projects", {project_code: results[i]._id}, function (err, doc) {
            if (i < results.length-1) {
                // console.log(i, results.length, doc);
                results[i].project = doc;
                i++;
                insertOne();
            }
            else {
                callback(results);
                return;
            }

        });

// *******************************************


    })();
}

dbGetVotesResults = function(callback){

    ConnectAndExec(function (db)
    {
        var collection = db.collection('voters');

        collection.aggregate(
            [
                { $sort : { voted: 1} },
                { $group: {
                    _id : "$voted",
                    count: { $sum: 1 } } }
            ],
            function (err, result) {
                if (err)
                    console.log(cfg.getTimeStamp()," dbGetVotesResults |info| VOTES SUMMARY: ",  err);
                else {
                    console.log(cfg.getTimeStamp(), " dbGetVotesResults |info| VOTES SUMMARY: ", JSON.stringify(result));
                }

                dbAddProjectdetails2Votes(result, function(results){
                    callback(result)
                });

            });
    });
}

dbNumberOfVoters = function(callback)
{
    var result = {  };

    ConnectAndExec(function (db)
    {
        var collection = db.collection('voters');
        collection.find({}).
            toArray(function (err, docs) {
                result.numberOfVoters = docs.length;
                collection.find({voted: {$ne: ""}}).toArray(
                    function (err, docs) {
                        result.voted = docs.length;
                        callback(result);
                        db.close();
                    });

            });

    });
}

module.exports.findVoter = findVoter;
module.exports.getProjectMembers = getProjectMembers;
module.exports.getProjectDetails = getProjectDetails;
module.exports.getBuProjects = getBuProjects;
module.exports.getBuProjectsEx = getBuProjectsEx;
module.exports.getProjects = getProjects;
module.exports.getVotes = getVotes;
module.exports.dbGetUserRecord = dbGetUserRecord;
module.exports.dbCheckIfUserCanVote4Project = dbCheckIfUserCanVote4Project;
module.exports.doVote = doVote;
module.exports.dbGetFinalProjectToVote = dbGetFinalProjectToVote;
module.exports.dbResetVotes = dbResetVotes;
module.exports.dbGetVotesResults = dbGetVotesResults;
module.exports.dbGetProjects = dbGetProjects;
module.exports.dbGetAllProjects = dbGetAllProjects;
module.exports.dbNumberOfVoters = dbNumberOfVoters;