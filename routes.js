var express = require('express');
var logic   = require('./logicmdb');
var cfg     = require('./configmgr');
var config = require('config');

// return list of summaries votes
var REST_Votes = function (req, res) {
    cfg.logInfo('REST', 'REST_Votes');
    logic.dbGetVotesResults(function (VotingResultSet) {
        res.json(VotingResultSet);
    });
};

var REST_Voters = function (req, res) {

    cfg.logInfo('REST', "REST_Voters id=" + req.query.id);

    // user id query field is mandatory
    if (!req.query.id) {
        cfg.logError('REST', "REST_Voters user id " + req.query.id + " is missing");
        res.json({result: "Error: User ID query string parameter is mandatory"});
        return;
    }

    // look for specific user in database
    logic.findVoter(req.query.id, function (err, voter) {
        cfg.logInfo("REST", "REST_Voters result=" + JSON.stringify(voter) + " err=" + err);
        if (voter == null) {
            console.warn(cfg.getTimeStamp(), " REST_Voters |warn|",
                req.query.id, " not found");

            res.json({result: "Not Found"});
            return;
        }
        // we have the user record in "voter", now let's retrieve the project he can vote to

        // @TBD change that the projects are not the finals
        logic.dbGetFinalProjectToVote(function (ProjectsSet) {
            res.json({
                result: "Found",
                user: voter,
                projects: ProjectsSet,
                NOM: cfg.getNumOfNominates()
            });

        });
    });
};


/**
 * Perform the actual voting
 * @param req
 * @param res
 * @constructor
 */
var REST_Vote = function (req, res)
{
    cfg.logInfo('REST', "REST_Vote"
        + " id=" +       req.query.id
        + " token=" +   req.query.token
    );

    var ProjectsList = [];
    var i = 1;

    var currentProject = "project" + i;
    while(req.query.hasOwnProperty(currentProject))
    {
        ProjectsList.push(req.query[currentProject]);
        i++;
        currentProject = "project" + i;
    }

// validate that query parameters do exist
    if (!req.query.id || !req.query.token ) {
        res.json({result: "Error: ++++++++++ Invalid query string parameters."});
        cfg.logInfo('REST', " REST_Vote Invalid query string parameters "
            + " id=" +req.query.id
            + " token=" + req.query.token            );
    }
    else {
        logic.doVoteEx(req.query.id, req.query.token, ProjectsList, function (cb) {
            res.json(cb);
        })
    }
};

/** Retrieve project details and associates users
 *
 * @param req
 * @param res
 * @constructor
 */
var REST_Project = function(req, res)
{
    console.log(cfg.getTimeStamp(),"REST_Project |info|", "project id=", req.query.id);

    if (!req.query.id) {
        res.json({result: "Error: Invalid query string parameters."});
        console.error(cfg.getTimeStamp(), "REST_Project |error|",
            " Invalid query string parameters project id=", req.query.id);
    }
    else {
        logic.getProjectDetails(req.query.id, function (project_record) {
            logic.getProjectMembers(req.query.id, function (err, docs) {
                res.json({project: project_record, members: docs});

            });
        });
    }
};

REST_Projects = function(req, res)
{
    console.log(cfg.getTimeStamp()," REST_Projects |info|");

    logic.dbGetAllProjects(function(projects) {
            console.log(cfg.getTimeStamp()," REST_Projects |info| ", "number of projects=", projects.length);
            res.json(projects);
/*            res.json({
                "number of projects" : projects.length
                , "projects" : projects
            });*/

    });
};

REST_ResetVotes = function(req, res)
{
    console.log(cfg.getTimeStamp()," REST_ResetVotes |info| ");
    logic.dbResetVotes(function(err) {
        console.log(cfg.getTimeStamp()," REST_ResetVotes |info| done");
        res.json({ result: "Reset Votes : "+ err == null ? "no error" : JSON.stringify(err)});

    })
};

var REST_stat = function(req, res)
{
    var voting = config.get('Voting');
    console.log(cfg.getTimeStamp()," REST_stat |info| ");

    rres = {
        Round1: {Start: voting.Round1.Start, End: voting.Round1.End},
        Round2: {Start: voting.Round2.Start, End: voting.Round2.End}
    }

    logic.dbNumberOfVoters(function(ares)
    {
        rres.db_stat = ares;
        res.json(rres);

    });
};



module.exports.REST_Votes   = REST_Votes;
module.exports.REST_Voters  = REST_Voters;
module.exports.REST_Vote    = REST_Vote;
module.exports.REST_Project = REST_Project;
module.exports.REST_ResetVotes = REST_ResetVotes;
module.exports.REST_stat = REST_stat;
module.exports.REST_Projects = REST_Projects;



/*

group by BU:

 db.voters.aggregate(
 [
 { $sort : { bu: 1} },
 { $group: {
 _id : "$bu",
 count: { $sum: 1 } } }
 ]
 )


 db.voters.aggregate(
 [
 { $sort : { bu: 1} },
 { $group:
 {
 _id : {bu: "$bu", site: "$site" },
 count: { $sum: 1 }
 }
 }
 ]
 )


 db.voters.aggregate(
 [
 { $sort : { voted: 1} },
 { $group: {
 _id : "$voted",
 count: { $sum: 1 } } }
 ]
 )

 db.getCollection('voters').find( {voted : { $ne :"" }})


 */


REST_VotersDeprecated = function (req, res) {

    console.log(cfg.getLogHeader('REST', 'INFO')
        , "id=", req.query.id);

    // user id query field is mandatory
    if (!req.query.id) {
        console.error(cfg.getLogHeader('REST', 'ERROR'), " REST_Voters"
            , " user id "
            , req.query.id
            , " is missing");

        res.json({result: "Error: User ID query string parameter is mandatory"});
        return;
    }

    // look for specific user in database
    logic.findVoter(req.query.id, function (err, voter) {
        console.log(cfg.getTimeStamp(), " REST_Voters |info|"
            , " result=", "\n", voter, "\n"
            , "err=", err);

        if (voter == null) {
            console.warn(cfg.getTimeStamp(), " REST_Voters |warn|",
                req.query.id, " not found");

            res.json({result: "Not Found"});
            return;
        }
        // we have the user record in "voter", now let's retrieve the project he can vote to

        switch (cfg.cfgGetRoundNumber()) {
            case 0: // no voting yet, so not project to vote for.
                res.json({result: "Found", user: voter, NOM: cfg.getNumOfNominates()});
                break;
            case 1:// first round, projects per BU
                logic.getBuProjectsEx(voter.project, voter.bu, function (err, rr) {
                    res.json({result: "Found", user: voter, projects: rr, NOM: cfg.getNumOfNominates()});
                });
                break;
            case 2: // second round - final projects
                logic.dbGetFinalProjectToVote(function (rr) {
                    res.json({result: "Found", user: voter, projects: rr, NOM: cfg.getNumOfNominates()});

                });
                break;
        }
    });
};


 /**
 * Perform the actual voting
 * @param req
 * @param res
 * @constructor
 */
/*
REST_VoteDepracted = function (req, res)
    {

        console.log(cfg.getTimeStamp()," REST_Vote |info|"
            , "id=",      req.query.id
            , "token=",   req.query.token
            , "project=", req.query.project);

// validate that query parameters do exist
        if (!req.query.id || !req.query.token || !req.query.project) {
            res.json({result: "Error: ++++++++++ Invalid query string parameters."});
            getVotes console.error(cfg.getTimeStamp()," REST_Vote |error|"
                , "Invalid query string parameters "
                , "id=",      req.query.id
                , "token=",   req.query.token
                , "project=", req.query.project);
        }
        else {
            logic.doVote(req.query.id, req.query.token, req.query.project, function (cb) {
                res.json(cb);
            })
        }
    }
*/

