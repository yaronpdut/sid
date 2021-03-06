var express = require('express');
var logic = require('./logic');
var fs =  require('fs');
var cfg = require('./configmgr');
/*

    WorkFlow:

    * User enters user name and employee id.
    * Client call /login and in response validate that employee id is OK, and if user already voted.
    * If user does not vote then
        * Client call /projects and receives projects list
        * User prioritiezed project and submit voting
        * Client call /vote with voting information
    * Done

 */


var REST_CheckUserCredentials = function (req, res) {
    cfg.logInfo('REST', "REST_CheckUserCredentials id=" + req.query.id + " token=" + req.query.token);
    if (!req.query.id || !req.query.token) {
        cfg.logError('REST', "REST_CheckUserCredentials invalid parameters");
        res.json({result: "Error: User ID and Token query string parameter is mandatory"});
        return;
    }

    logic.findVoter(req.query.id, function (err, voter) {
        if (voter == null) {
            console.warn(cfg.getTimeStamp(), " REST_GetVoterInfo |warn|",
                req.query.id, " not found");

            res.json({result: "Not Found"});
            return;
        }
        if (voter.emp_number == req.query.token) {
            res.json({
                    result: "OK",
                    voted: typeof(voter.rating) !== 'undefined',
                    "state" :  fs.existsSync('vote.flg')
                }
            );
        }
        else {
            res.json(
                {
                    result: "Fail"
                });
        }
    });
};




var REST_ResetVoterRating = function (req, res) {
    cfg.logInfo('REST', 'REST_ResetVoterRating');
    logic.dbResetRating(req.query.id, function (VotingResultSet) {
        res.json(VotingResultSet);
    });
};


// return list of summaries votes

var REST_GetVotingSummary = function (req, res) {
    cfg.logInfo('REST', 'REST_GetVotingSummary');
    logic.dbGetVotesResults(function (VotingResultSet) {
        res.json(VotingResultSet);
    });
};

var REST_GetVoterInfo = function (req, res) {

    cfg.logInfo('REST', "REST_GetVoterInfo id=" + req.query.id);

    // user id query field is mandatory
    if (!req.query.id) {
        // cfg.logError('REST', "REST_GetVoterInfo user id " + req.query.id + " is missing");
        var Result = [];
        logic.listVoters(function (err, item) {
            item.forEach(function (element, index, array) {
                Result.push({
                    userName :element.userName
                    ,emp_number: element.emp_number
                    , email: element.email
                    , rating : JSON.stringify(element.rating)
                });
                if(index == array.length-1)
                {
                    res.json(Result);
                }
            });
        });
        // res.json({result: "Error: User ID query string parameter is mandatory"});
        return;
    }


    // look for specific user in database
    logic.findVoter(req.query.id, function (err, voter) {
        cfg.logInfo("REST", "REST_GetVoterInfo result=" + JSON.stringify(voter) + " err=" + err);
        if (voter == null) {
            console.warn(cfg.getTimeStamp(), " REST_GetVoterInfo |warn|",
                req.query.id, " not found");

            res.json({result: "Not Found"});
            return;
        }
        // we have the user record in "voter", now let's retrieve the project he can vote to

        // @TBD change that the projects are not the finals
        logic.dbGetAllProjects(function (ProjectsSet) {
            res.json({
                result: "Found",
                user: voter,
                projects: ProjectsSet,
                NOM: cfg.getNumOfNominates(),
                "state" :  fs.existsSync('vote.flg')

            });

        });
    });
};


var REST_SubmitUserVote = function (req, res) {
    cfg.logInfo('REST', "REST_SubmitUserVote"
        + " id=" + req.query.id
        + " token=" + req.query.token
    );

    var ProjectsList = [];
    var i = 1;

    // build projects list from query string projectN variables.
    var currentProject = "project" + i;
    while (req.query.hasOwnProperty(currentProject)) {
        ProjectsList.push(req.query[currentProject]);
        i++;
        currentProject = "project" + i;
    }

// validate that query parameters do exist
    if (!req.query.id || !req.query.token) {
        res.json({result: "Error: Invalid query string parameters."});
        cfg.logInfo('REST', "REST_SubmitUserVote Invalid query string parameters "
            + " id=" + req.query.id
            + " token=" + req.query.token);
    }
    else {
        logic.doVote(req.query.id, req.query.token, ProjectsList, function (cb) {
            res.json(cb);
        })
    }
};

// Retrieve project details and associates users

var REST_GetProjectInfo = function (req, res) {
    cfg.logInfo("REST", "REST_GetProjectInfo ", "project id=", req.query.id);

    if (!req.query.id) {
        res.json({result: "Error: Invalid query string parameters."});
        console.error(cfg.getTimeStamp(), "REST_GetProjectInfo |error|",
            " Invalid query string parameters project id=", req.query.id);
    }
    else {
        logic.getProjectDetails(req.query.id, function (project_record) {
                res.json({project: project_record});

            });
    }
};

REST_GetProjectsList = function (req, res) {

    cfg.logInfo("REST", " REST_GetProjectsList");

    logic.dbGetAllProjects(function (projects) {
        cfg.logInfo('"REST', " REST_GetProjectsList number of projects=" + projects.length);
        res.json(projects);
    });
};

REST_ResetVotes = function (req, res) {
    if(req.query.id != "71029")
        return;
    
    cfg.logInfo('"REST', "REST_ResetVotes");
    logic.dbResetVotes(function (err) {
        cfg.logInfo('"REST', " REST_ResetVotes done");
        res.json({result: "Reset Votes : " + err == null ? "no error" : JSON.stringify(err)});

    })
};

var REST_SetVoteState = function (req, res) {
    cfg.logInfo('"REST', "REST_SetVoteState");

    if(!req.query.state) {
        res.json({result: "state parameter is missing"})
    }
    else {    
        if(req.query.state == "1")
        {
            fs.open('vote.flg', 'w+', 0666, function(err, fd) {
                res.json({result: "OK"})
                fs.close(fd);
            } );
        }
        else 
        {
            fs.unlink('vote.flg');
            res.json({result: "OK"})
        }
    }
}


var REST_GetStatistics = function (req, res) {

    cfg.logInfo('"REST', "REST_GetStatistics");

    var rres = {};

    rres.state =  fs.existsSync('vote.flg');

    logic.dbNumberOfVoters(function (ares) {
        rres.db_stat = ares;

        res.json(rres);


    });
};




module.exports.REST_GetVotingSummary = REST_GetVotingSummary;
module.exports.REST_GetVoterInfo = REST_GetVoterInfo;
module.exports.REST_SubmitUserVote = REST_SubmitUserVote;
module.exports.REST_GetProjectInfo = REST_GetProjectInfo;
module.exports.REST_ResetVotes = REST_ResetVotes;
module.exports.REST_GetStatistics = REST_GetStatistics;
module.exports.REST_GetProjectsList = REST_GetProjectsList;
module.exports.REST_CheckUserCredentials = REST_CheckUserCredentials;
module.exports.REST_SetVoteState = REST_SetVoteState;
module.exports.REST_ResetVoterRating = REST_ResetVoterRating;
