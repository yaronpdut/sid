var express = require('express');
var logic   = require('./logic');
var cfg     = require('./configmgr');

REST_Votes = function (req, res) {
    var arrDistribution = []; // summed results
    logic.getVotes(function (lstVoters) {
        lstVoters.forEach(function (currentValue, index, array) {
            if (currentValue) {
                arrDistribution.push({project: index, votes: currentValue});
            }
        });
        console.dir(arrDistribution);
        res.json(arrDistribution);
    });
}

REST_Voters = function (req, res) {
    console.log("REST: voters ", req.query.id);

    // user id query field is mandatory
    if (!req.query.id) {
        console.log("REST: voters - user id is missing");
        res.json({result: "Error: User ID query string parameter is mandatory"});
        return;
    }

    // look for specific user in database
    logic.findVoter(req.query.id, function (err, voter) {
        console.log("voters result: ", JSON.stringify(err), " ", JSON.stringify(voter));

        if (!err) {
            res.json({result: "Not Found"});
            return;
        }
        // we have the user record in "voter", now let's retrieve the project he can vote to

        console.log("Round = " + cfg.cfgGetRoundNumber());
        switch (cfg.cfgGetRoundNumber()) {
            case 0: // no voting yet, so not project to vote for.
                res.json({result: "Found", user: voter, round: cfg.cfgGetRoundNumber()});
                break;
            case 1: // first round, projects per BU
                logic.getProjects(req.query.id, function (rr) {
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

REST_Vote = function (req, res) {

// validate that query parameters do exist
    if (!req.query.id || !req.query.token || !req.query.project) {
        res.json({result: "Error: Invalid query string parameters."});
    }
    else {
        logic.doVote(req.query.id, req.query.token, req.query.project, function (cb) {
            res.json(cb);
        })
    }
}


module.exports.REST_Votes   = REST_Votes;
module.exports.REST_Voters  = REST_Voters;
module.exports.REST_Vote    = REST_Vote;


