/*global kendo */
//1.  Cleanup model
//2.  Login error messages
//3.  Voting error messages


var projectsDataSource = new kendo.data.DataSource({}),

    server = "http://nsdv-sidv.rhcloud.com//",
    // server = "http://127.0.0.1:8080/",
    projectNameToCodeMap = {},
    kendoMobileApp,
    loggedUserId,
    loggedUserToken,
    alreadyVotedMessage = "<div style='text-align: left;'><b>Ooops..</b></div><div style='text-align: left;'>It appears you have already voted.<br/>Thanks and see you at the closing of Ship It day!</div>",

    mainModel = kendo.observable({
        voted: false,
        user: {},
        round: 0,
        project: {description: ''},
        bob: 'scott',
        projectsSource: '',

        login: function () {
            'use strict';

            var username = $("#username").val(),
                password = $("#password").val();

            $.ajax({
                dataType: "json",
                data: {id: username, token: password},
                url: "login"
            }).done(function (data) {
                //clear previous user data
                loggedUserId = '';
                loggedUserToken = '';

                console.log(data);
                if (data.result.toLowerCase() == "ok") {
                    if (data.voted == true) {
                        mainModel.popupMessage(alreadyVotedMessage);
                    } else {
                        loggedUserId = username;
                        loggedUserToken = password;
                        mainModel.getProjects();
                    }
                }
                else {
                    mainModel.popupMessage("<div style='text-align: left;'><b>Login Failed</b></div><div style='text-align: left;'>Please verify entered credentials and try again.</div>");
                }
            }).fail(function () {
                console.log('there was an error in login process');
            });
        },

        getProjects: function () {
            mainModel.set('user', loggedUserId);

            $.ajax({
                dataType: "json",
                data: {id: loggedUserId},
                url: "voters"
            }).done(function (data) {
                console.log(data);
                data.projects.sort(function (a, b) {
                    if (a.project_name < b.project_name) {
                        return -1;
                    }
                    if (a.project_name > b.project_name) {
                        return 1;
                    }
                    return 0;
                });
                projectsDataSource.data([]);
                projectNameToCodeMap = [];

                $.each(data.projects, function (index, item) {
                    console.log(item);
                    projectsDataSource.add(item);
                    projectNameToCodeMap[item.project_name.trim()] = item.project_code.trim();
                });
                kendoMobileApp.navigate('#projects-view');
            }).fail(function () {
                console.log('there was an error getting the projects list');
            });
        },

        popupMessage: function (message) {
            $('.cd-popup').find("p").html(message);
            $('.cd-popup').addClass('is-visible');
        },

        reset: function (message) {
            kendoMobileApp.navigate('#login-view');
        },

        submitVote: function () {

            var results = [];
            $("#projectsTable").each(function () {
                var phrase = '';
                $(this).find('li').each(function () {
                    var current = $(this);
                    results.push(projectNameToCodeMap[current.text().trim()]);
                    //alert(projectNameToCodeMap[current.text().trim()]);
                });
            });

            mainModel.sendResults(results);
            //alert(results);
            //mainModel.popupMessage('<div><h1>Thank you for voting</h1><p>Join us at the end of Ship It! day to see who won.</p></div>');
            //$("#submit-footer").hide();
            mainModel.popupMessage("<div style='z-index:99999;text-align: left;'><h3>Thank you for voting!</h3><div><b>Join us at the end of Ship It day to see who won!</b></div></div>");
        },

        sendResults: function (results) {
            var voteData = {};
            voteData.id = loggedUserId;
            voteData.token = loggedUserToken;

            for (var i = 0; i < results.length; i++) {
                voteData["project" + (i + 1)] = results[i];
            }

            $.ajax({
                dataType: "json",
                data: voteData,
                url: "vote"
            }).done(function (data) {
                console.log(data);
                if (data.error == 3) {
                    mainModel.popupMessage(alreadyVotedMessage);
                } else {
                    mainModel.popupMessage("<div style='z-index:99999;text-align: left;'><h3>Thank you for voting!</h3><div><b>Join us at the end of Ship It day to see who won!</b></div></div>");
                }
            }).fail(function () {
                console.log('there was an error sending the results');
            });
        },

        vote: function () {
            if (!this.voted) {
                $.ajax({
                    dataType: "json",
                    data: {
                        id: mainModel.user.userName,
                        project: mainModel.project.project_code,
                        token: mainModel.user.emp_number
                    },
                    url: server + "vote"
                }).done(function (data) {

                    this.voted = true;
                    if (typeof data.error !== "undefined") {
                        switch (data.error) {
                            case 0: // OK
                                $("#thankYou").text("Thank you for voting!!")
                                break;
                            case 3: // already voted
                                $("#thankYou").text("Thank you for voting, but you already voted!")
                                break;


                        }
                    }
                });
            }

            kendoMobileApp.navigate('#voted-view');
        },

        about: function () {
            kendoMobileApp.navigate('#about-view', 'zoom');
        }
    });

kendoMobileApp = new kendo.mobile.Application(document.body, {
    skin: "flat",
    init: function () {
        'use strict';
        /*
         setTimeout(function() {
         kendo.fx(".splash").fadeOut().duration(700).play();
         }, 1000);
         */

        if (document.location.hash.length > 0) {
            document.location.hash = '';
        }
    }
});


