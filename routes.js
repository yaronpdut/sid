var express = require('express');
var logic   = require('./logic');
var cfg     = require('./configmgr');

REST_Votes = function (req, res)
{
    var arrDistribution = []; // summed results

    console.log('|rest| votes API request ')
    logic.getVotes(function (lstVoters) {
        lstVoters.forEach(function (currentValue, index, array) {
            if (currentValue) {
                arrDistribution.push({project: index, votes: currentValue});
            }
        });
        console.dir();
        console.log('|rest| votes API request response with %s elements in table', lstVoters.length.toString())

        res.json({votes: arrDistribution });
    }, req.query.bu);
}

REST_Voters = function (req, res) {
    console.log("|rest| voters API request id=%s round=%s", req.query.id, cfg.cfgGetRoundNumber());

    // user id query field is mandatory
    if (!req.query.id)
    {
        console.warn("|rest|warning| voters - user id is missing %s", req.query.id);
        res.json({result: "Error: User ID query string parameter is mandatory"});
        return;
    }

    // look for specific user in database
    logic.findVoter(req.query.id, function (err, voter)
    {
        console.log("|rest| voters result=%j err=%j ", voter, err);

        if (!err) {
            console.warn("|rest| voters %j not found", req.query.id);
            res.json({result: "Not Found"});
            return;
        }
        // we have the user record in "voter", now let's retrieve the project he can vote to

        switch (cfg.cfgGetRoundNumber()) {
            case 0: // no voting yet, so not project to vote for.
                res.json({result: "Found", user: voter, round: cfg.cfgGetRoundNumber()});
                break;
            case 1: // first round, projects per BU
                logic.getBuProjects(req.query.id, voter.bu, function (rr)
                    {
                    res.json({result: "Found", user: voter, projects: rr, round: cfg.cfgGetRoundNumber()});
                    });
                break;
            case 2: // second round - final projects
                logic.dbGetFinalProjectToVote(function (rr) {
                    res.json({result: "Found", user: voter, projects: rr, round: cfg.cfgGetRoundNumber()});

                });
                break;
        }
    });
}

/**
 * Perform the actual voting
 * @param req
 * @param res
 * @constructor
 */
REST_Vote = function (req, res)
{
    console.log("|rest| vote API request id=%s token=%s project=%s", req.query.id, req.query.token, req.query.project);

// validate that query parameters do exist
    if (!req.query.id || !req.query.token || !req.query.project) {
        res.json({result: "Error: Invalid query string parameters."});
        console.warn("|rest| vote API Invalid query string parameters id=%s token=%s project=%s", req.query.id, req.query.token, req.query.project);
    }
    else {
        logic.doVote(req.query.id, req.query.token, req.query.project, function (cb) {
            res.json(cb);
        })
    }
}

/** Retrieve project details and associates users
 *
 * @param req
 * @param res
 * @constructor
 */
REST_Project = function(req, res)
{
    console.log("|rest| project API request project id=%s ", req.query.id);

    if (!req.query.id) {
        res.json({ result: "Error: Invalid query string parameters."});
        console.warn("|rest| project API Invalid query string parameters id=%s", req.query.id);
    }

    logic.getProjectDetails(req.query.id, function(project_record) {
        logic.getProjectMembers(req.query.id, function(err, docs) {
            res.json( { project: project_record, members: docs });

        });
    });
}


module.exports.REST_Votes   = REST_Votes;
module.exports.REST_Voters  = REST_Voters;
module.exports.REST_Vote    = REST_Vote;
module.exports.REST_Project = REST_Project;


