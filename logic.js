var MongoClient = require('mongodb').MongoClient;
var MongoServerUrl;
var cfg     = require('./configmgr');

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
// S U P P O R T   F U N C T I O N S    A N D    W R A P P E R S
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

// check operating environment for MongoDB connection string

if (process.env.OPENSHIFT_NODEJS_IP === undefined) {
    MongoServerUrl = 'mongodb://:localhost/test';
}
else {
    MongoServerUrl = 'mongodb://admin:NHigCk3xNWdf@127.9.4.2:27017/nsdv';
}

cfg.logInfo('LOGIC', '[BOOT] MongoDB Database Path = ' + MongoServerUrl);

// wrapper for database connection

var ConnectAndExec = function (callback) {
    MongoClient.connect(MongoServerUrl, function (err, db) {
        callback(db);
    });
};

// query for single record wrapper

var doFindOne = function (collectionName, Query, Callback) {
    ConnectAndExec(function (db) {
        var collection = db.collection(collectionName);
        collection.findOne(Query, function (err, item) {
            Callback(err, item);
            db.close();
        });
    });
};

// query wrapper

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

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -//

var findVoter = function (theUserName, callback) {

    // create in-sensitive case search using regular expression
    var query = {userName: new RegExp(theUserName, "i")};
    doFindOne("voters", query, function (err, item) {
        cfg.logInfo('LOGIC', " findVoter looking for voter: " + theUserName);

        if (item)
            callback(err, item);
        else { // try to look by its e-mail address
            query = {email: new RegExp(theUserName, "i")};
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
        cfg.logInfo('LOGIC',"getProjectDetails: project=" + proj_code);
        callback(item);
    });
};

// retrieve projects list

var dbGetAllProjects = function (callback) {
    doFind("projects", {}, function (err, item) {
        cfg.logInfo('LOGIC',"dbGetAllProjects: error code =" + err );
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
        }

    });
};

var getProjects = function (exclude_prj_code, callback) {
    doFind("projects", {project_code: {$ne: exclude_prj_code}}, function (err, docs) {
        callback(err, docs);
    });
};

var dbGetUserRecord = function (username, callback) {
    doFindOne('voters', {userName: username}, function (err, docs) {
        callback(docs);
    });

};

var dbUpdateVoterRecWithRating = function (user, voted_project, callback) {
    console.log(cfg.getTimeStamp()," dbUpdateVoterRecWithRating updating vote record for ");

    ConnectAndExec(function (db) {
        var collection = db.collection('voters');

        collection.updateOne(
            user,
            {$set: {rating: voted_project}},
            {},
            function (err, numReplaced) {
                if (err) {

                    cfg.logError('LOGIC', "dbUpdateVoterRecWithRatinge:  " + err);
                }
                else {
                    cfg.logInfo('LOGIC', " dbUpdateVoterRecWithRating");
                }
                callback(err)
            });
    });
};

var dbUpdateVoterRecWithRatingEx = function (user, projects, callback) {
    cfg.logInfo("LOGIC", "dbUpdateVoterRecWithRating updating vote record for "+ JSON.stringify(user));

    ConnectAndExec(function (db) {
        var collection = db.collection('voters');

        collection.updateOne(
            user,
            {$set: {rating: projects}},
            {},
            function (err, numReplaced) {
                if (err) {

                    cfg.logError('LOGIC', "dbUpdateVoterRecWithRatingExx:  " + err);
                }
                else {
                    cfg.logInfo('LOGIC', " dbUpdateVoterRecWithRatingEx");
                }
                callback(err)
            });
    });
};


var dbVerifyProjectsExists = function (user, projects, callback)
{
    var i;

    for (i = 0; i < projects.length; i++)
    {
        (function(i) {
            doFind('projects', {"project_code": projects[i]}, function (err, docs)
            {
                if (docs.length == 0) {
                    cfg.logError('LOGIC', "dbVerifyProjectsExists Invalid Project Id " + projects[i]);
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
/*
var doVote = function (username, token, projects, callback) {
    cfg.logInfo("LOGIC", "doVote " + username + " " + token);

    // retrieve user record first

    dbGetUserRecord(username, function (user) {
        if (!user || user.emp_number != token) {
            cfg.logError('LOGIC', " doVote Invalid user name or token" + username + token);
            callback({error: 6, result: "Error: Invalid user name or token"});
            return;
        }

        dbVerifyProjectsExists(user, projects, function (err, reason) {
            if (err) {
                callback(reason);
            }

                dbUpdateVoterRecWithRatingEx(user, projects, function (err) {
                    callback({error: 0, result: "OK"});
                });


        });


    });
};
*/
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
        if(typeof(user.rating) !== 'undefined')
        {
            // already voted
            callback({error: 3, result: "Error: User already voted"});
            return;
        }

        dbUpdateVoterRecWithRating(user, project, function (err) {
            callback({ error: 0, result: "OK" });
        });
    });
};

var dbResetVotes = function (callback) {
    ConnectAndExec(function (db)
    {
        var collection = db.collection('voters');

        collection.update(
            {},
            {$set: {rating: ""} },
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



    })();
};

var dbAddProjectdetails2VotesEx = function(results, callback)
{
    var i = 0;
    (function insertOne() {

        doFindOne("projects", {project_code: results[i].projectCode}, function (err, doc) {
            if (i < results.length-1) {
                // console.log(i, results.length, doc);
                results[i].project_name = doc.project_name;
                i++;
                insertOne();
            }
            else {
                results[i].project_name = doc.project_name;
                callback(results);
                return;
            }

        });



    })();
};



var dbNumberOfVoters = function(callback)
{
    var result = {  };

    ConnectAndExec(function (db)
    {
        var collection = db.collection('voters');
        collection.find({}).
            toArray(function (err, docs) {
                result.numberOfVoters = docs.length;
                collection.find({rating : {$exists : true }}).toArray(
                    function (err, docs) {
                        result.voted = docs.length;
                        callback(result);
                        db.close();
                    });

            });

    });
};

var dbGetVotesResults = function(callback)
{
    // filter only for rated records
    var findString = {
        rating : {$exists : true }
    };

    var ratingResults = []
    var NOM;

    ratingResults.raw = [];
    doFind('voters', findString, function (err, docs) {
        for (var i = 0; i < docs.length; i++) {
            NOM = cfg.getNumOfNominates();
            // @TBD limit iteration only for getNumOfNominates items.

            // run over all rating array
            for (var j = 0; j < docs[i].rating.length; j++) {
                if (ratingResults[docs[i].rating[j]] == undefined)
                {
                    ratingResults[docs[i].rating[j]] = {
                        projectCode : docs[i].rating[j],
                        value : 1,
                        weightValue : NOM,
                        weightValue2 : 0
                    } ;
                }
                else
                {
                    ratingResults[docs[i].rating[j]].value += 1;
                    ratingResults[docs[i].rating[j]].weightValue += NOM;
                }
                if(j > 0) // from number 2
                {
                    ratingResults[docs[i].rating[j]].weightValue2 += NOM;
                }

                NOM--;
            }
        }
        ratingResults = ratingResults.filter(function(n){ return n != null }); // clean NULLs from array
        dbAddProjectdetails2VotesEx(ratingResults, function() {
            callback(ratingResults);
        });

    });
};


module.exports.findVoter = findVoter;
module.exports.getProjectMembers = getProjectMembers;
module.exports.getProjectDetails = getProjectDetails;
module.exports.getProjects = getProjects;
module.exports.doVote = doVote;
module.exports.dbResetVotes = dbResetVotes;
module.exports.dbGetVotesResults = dbGetVotesResults;
module.exports.dbGetProjects = dbGetProjects;
module.exports.dbGetAllProjects = dbGetAllProjects;
module.exports.dbNumberOfVoters = dbNumberOfVoters;
