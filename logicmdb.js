var MongoClient = require('mongodb').MongoClient;
var MongoServerUrl;

// check operating environment for MongoDB connection string
if (process.env.OPENSHIFT_NODEJS_IP === undefined) {
    MongoServerUrl = 'mongodb://:localhost/test';
}
else {
    MongoServerUrl = 'mongodb://admin:NHigCk3xNWdf@127.9.4.2:27017/nsdv';
}

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
    doFindOne("voters", {userName: theUserName}, function (err, item) {
        console.log("|log| looking for voter %s found=%j docs=%j", theUserName, err, item);
        callback(err, item);
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
        console.log("|log| looking for project %s found=%j record=%j", proj_code, err, item);
        callback(item);
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
                console.log(docs[i].voted);
                if (results[docs[i].voted] == undefined)
                    results[docs[i].voted] = 1;
                else
                    results[docs[i].voted] += 1;
            }
        }
        console.log(results);
        callback(results);

    });
};


var dbGetUserRecord = function (username, callback) {
    doFindOne('voters', {userName: username}, function (err, docs) {
        callback(docs);
    });

};

var updateUserRecWithVote = function (user, voted_project, callback) {
    console.log(JSON.stringify(user));
    ConnectAndExec(function (db) {
        var collection = db.collection('voters');

        collection.updateOne(
            user,
            {$set: {voted: voted_project}},
            {},
            function (err, numReplaced) {
                if (err) console.log("UPDATE: " + err);
                else console.log("UPDATE numReplaced: " + numReplaced);
                callback(err)
            });
    });
};

var dbCheckIfUserCanVote4Project = function (user, project, callback) {
    // get project record

    switch (cfg.cfgGetRoundNumber()) {
        case 1 : // user cannot vote to its own project
            if (user.project != null && user.project == project) {
                console.log("|logic| Error: User can not vote to a project associated with");
                callback(true, {reason: "Error: User can not vote to a project associated with"});
                return;
            }

            // find the project
            doFind('projects', {"project_code": project}, function (err, docs) {
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
        case 2: // find the project in final projects
            doFind('finals', {"project_code": project}, function (err, docs) {
                if (docs.length == 0) {
                    console.log("|logic| Error: Invalid Project Id");
                    callback(true, {reason: "Error: Invalid Project Id. Project code not found"});
                }
            });
            break;
    }
};

var doVote = function (username, token, project, callback) {
    console.log("|logic| do vote: %s %s %s ", username, token, project);

    // retrieve user record first
    dbGetUserRecord(username, function (user) {
        if (!user || user.emp_number != token) {
            console.log("|logic| Invalid user name or token");
            callback('{ result: "Error: Invalid user name or token" }');
            return;
        }

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

};

var dbGetFinalProjectToVote = function (callback) {
    doFind('finals', {}, function (err, docs) {
        callback(docs);
    });
};

/*
 findVoter("Yaron Pdut", function (err, item) {
 console.dir(item);
 });

 getProjectMembers("1", function (err, item) {
 console.dir(item);
 });
 */

module.exports.findVoter = findVoter;
module.exports.getProjectMembers = getProjectMembers;
module.exports.getProjectDetails = getProjectDetails;
module.exports.getBuProjects = getBuProjects;
module.exports.getProjects = getProjects;
module.exports.getVotes = getVotes;
module.exports.dbGetUserRecord = dbGetUserRecord;
module.exports.dbCheckIfUserCanVote4Project = dbCheckIfUserCanVote4Project;
module.exports.doVote = doVote;
module.exports.dbGetFinalProjectToVote = dbGetFinalProjectToVote;