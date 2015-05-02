var MongoClient = require('mongodb').MongoClient;
var MongoServerUrl;
var cfg     = require('./configmgr');

/*

Current Voters Scheme:

 {
 "userName"
 "emp_number"
 "site"
 "bu"
 "project"
 "voted"
 "final_vote"
 "location"
 "email"
 "country"
 "supervisor"
 "directorName"
 "VP_name"
 "Top_VP_name"
 "ELT_name"
 }

In order to support rating, ther following structure where added

 "rating" : [
 "1",
 "2",
 3,
 4
 ],

 or in JS: var rating = ["1","2",3,4]

 */


// check operating environment for MongoDB connection string
if (process.env.OPENSHIFT_NODEJS_IP === undefined) {
    MongoServerUrl = 'mongodb://:localhost/test';
}
else {
    MongoServerUrl = 'mongodb://admin:NHigCk3xNWdf@127.9.4.2:27017/nsdv';
}

// console.log(cfg.getLogHeader('LOGIC', 'INFO'), " MongoDB Database Path = ", MongoServerUrl);
cfg.logInfo('LOGIC', "MongoDB Database Path = " + MongoServerUrl);

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

    // make search case in-sensetive
    var query = { userName: new RegExp(theUserName, "i") };
    doFindOne("voters", query, function (err, item) {
        cfg.logInfo('LOGIC'," findVoter looking for voter: " + theUserName);

        if(item)
            callback(err, item);
        else { // try to look by its e-mail address
            query = { email: new RegExp(theUserName, "i") };
            doFindOne("voters", query, function (err, item) {
                callback(err, item);
            });
        }
    });

};


// each user is associated with one project - in projct field
// in order to get project members, query voters for specific project

var getProjectMembers = function (proj_code, callback) {
    doFind("voters", {project: proj_code}, function (err, docs) {
        docs ? callback(true, docs) : callback(false);
    });
};

// retrieve project record

var getProjectDetails = function (proj_code, callback) {
    doFindOne("projects", {project_code: proj_code}, function (err, item) {
        cfg.logInfo('LOGIC'," findVoter looking for project" + proj_code + " found=" + err  + "record=" + item);
        callback(item);
    });
};

// retrieve projects list

var dbGetAllProjects = function (callback) {
    doFind("projects", {}, function (err, item) {
        callback(item);
    });
};

// retrieve list of projects with filter.
// "name" - specific project name
// "bu" - all project of specific BU.

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

// return list of projects for user excluding projects he can't vote for

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

//
//

var getVotes = function (callback, bunit) {

    var findString = '{'
                +  'voted : {$ne : "" }'
                + bunit == undefined ? {}: {bu: bunit}
                + '}';

    doFind('voters', findString, function (err, docs) {
        callback(docs);
    });
};


var dbGetUserRecord = function (username, callback) {
    doFindOne('voters', {userName: username}, function (err, docs) {
        callback(docs);
    });

};

var updateUserRecWithVote = function (user, voted_project, callback) {
    console.log(cfg.getTimeStamp()," updateUserRecWithVote updating vote record for ");

    ConnectAndExec(function (db) {
        var collection = db.collection('voters');

        collection.updateOne(
            user,
            {$set: {voted: voted_project}},
            {},
            function (err, numReplaced) {
                if (err) {

                    cfg.logError('LOGIC', " updateUserRecWithVote:  " + err);
                }
                else {
                    cfg.logInfo('LOGIC', " updateUserRecWithVote");
                }
                callback(err)
            });
    });
};

var dbCheckIfUserCanVote4Project = function (user, project, callback) {
    // get project record

    switch (cfg.cfgGetRoundNumber()) {
        case 1 : // user cannot vote to its own project
            if (user.project != null && user.project == project) {
                cfg.logError('LOGIC', " dbCheckIfUserCanVote4Project: User can not vote to a project associated with ",user);
                callback(true, {error: 1, reason: "Error: User can not vote to a project associated with"});
                return;
            }

            // find the project
            doFind('projects', {"project_code": project}, function (err, docs) {
                if (docs.length == 0) {
                    cfg.logError('LOGIC',  "dbCheckIfUserCanVote4Project Invalid Project Id " + project);
                    callback(true, {error: 2, reason: "Error: Invalid Project Id. Project code not found"});
                    return;
                }

                if (user.voted != '') {
                    cfg.logError('LOGIC',  "dbCheckIfUserCanVote4Project User already voted " + user.UserName);
                    callback(true, {error: 3, reason: "Error: User already voted"});
                    return;

                }
                // verify user and project are from the same BU
                if (user.bu != "ALL" && user.bu != docs[0].bu) {
                    cfg.logError('LOGIC',  " dbCheckIfUserCanVote4Project User cannot vote to a project not in its own BU " + user);
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
                    cfg.logError('LOGIC', "dbCheckIfUserCanVote4Project Invalid Project Id " + project);
                    callback(true, {error: 5, reason: "Error: Invalid Project Id. Project code not found"});
                    return;
                }
            });
            break;
    }
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

var updateUserRecWithVoteEx = function (user, projects, callback) {
    console.log(cfg.getTimeStamp()," updateUserRecWithVote updating vote record for ");

    ConnectAndExec(function (db) {
        var collection = db.collection('voters');

        collection.updateOne(
            user,
            {$set: {rating: projects}},
            {},
            function (err, numReplaced) {
                if (err) {

                    cfg.logError('LOGIC', " updateUserRecWithVoteEx:  " + err);
                }
                else {
                    cfg.logInfo('LOGIC', " updateUserRecWithVoteEx");
                }
                callback(err)
            });
    });
};


var dbVerifyProjectListValid = function (user, projects, callback)
{
    var i;

    for (i = 0; i < projects.length; i++)
    {
        (function(i) {
            doFind('projects', {"project_code": projects[i]}, function (err, docs)
            {
                if (docs.length == 0) {
                    cfg.logError('LOGIC', "dbVerifyProjectListValid Invalid Project Id " + projects[i]);
                    callback(true, {error: 5, reason: "Error: Invalid Project Id. Project code not found"});
                    return 0;
                }
                else {
                    if (i == projects.length-1) {
                        callback(false, {error: 0});

                    }
                }
            });
        })(i);
    }
};


var doVoteEx = function (username, token, projects, callback) {
    cfg.logInfo("LOGIC","doVoteEx " + username + " " + token);

    // retrieve user record first

    dbGetUserRecord(username, function (user) {
        if (!user || user.emp_number != token) {
            cfg.logError('LOGIC', " doVote Invalid user name or token" + username + token);
            callback({ error: 6, result: "Error: Invalid user name or token" });
            return;
        }

        dbVerifyProjectListValid(user, projects, function (err, reason) {
            if (err == false) {
                updateUserRecWithVoteEx(user, projects, function (err) {
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

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //


var doVote = function (username, token, project, callback) {
    console.log(cfg.getTimeStamp()," doVote ", username, token, project);
    // retrieve user record first
    dbGetUserRecord(username, function (user) {
        if (!user || user.emp_number != token) {
            cfg.logError('LOGIC', " doVote Invalid user name or token" + username + token + project);
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
                    cfg.logError('LOGIC'," dbResetVotes ");
                }
                else {
                    cfg.logInfo('LOGIC'," dbResetVotes Number of updated records= " + numReplaced.n);
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
                    cfg.logInfo('LOGIC',"dbGetVotesResults VOTES SUMMARY: " + err);
                else {
                    cfg.logInfo('LOGIC', "dbGetVotesResults VOTES SUMMARY: " + JSON.stringify(result));
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
module.exports.doVoteEx = doVoteEx;
module.exports.dbGetFinalProjectToVote = dbGetFinalProjectToVote;
module.exports.dbResetVotes = dbResetVotes;
module.exports.dbGetVotesResults = dbGetVotesResults;
module.exports.dbGetProjects = dbGetProjects;
module.exports.dbGetAllProjects = dbGetAllProjects;
module.exports.dbNumberOfVoters = dbNumberOfVoters;