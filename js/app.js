/*global kendo */
//1.  Cleanup model
//2.  Login error messages
//3.  Voting error messages


var projectsDataSource = new kendo.data.DataSource({
}),

//server = "http://nsdv-sidv.rhcloud.com//",
server = "http://127.0.0.1:8080/",
projectNameToCodeMap = {},
kendoMobileApp,
loggedUserId,
loggedUserToken,
alreadyVotedMessage = "<div style='text-align: left;'><h3>Ooops..</h3></div><br/><div style='text-align: left;'>It appears you have already voted.<br/>Thanks and see you at the closing of Ship It day!</div>",

mainModel =  kendo.observable({
    voted: false,
    user: {},
    round:0,
    project:{description:''},
    bob:'scott',
    projectsSource:'',

    init:function(){
        $("#username").val(mainModel.getCookie("username"));
    },

    login: function(){
        'use strict';

        var username = $("#username").val(),
            password = $("#password").val();

            $.ajax({
                dataType: "json",
                data: {id: username, token: password},
                url: "login"
            }).done(function(data) {
                //clear previous user data
                loggedUserId = ''; loggedUserToken = '';

                console.log(data);
                if(data.result.toLowerCase() == "ok") {
                    mainModel.setCookie("username",username, 10);
                    if(data.voted == true) {
                        //mainModel.popupMessage(alreadyVotedMessage);
                        loggedUserId = username;
                        loggedUserToken = password;
                        mainModel.changeToAlreadyVoted(false);
                        mainModel.getProjects(true);
                    }else {
                        loggedUserId = username;
                        loggedUserToken = password;
                        mainModel.changeToNotVoted();
                        mainModel.getProjects(false);
                    }
                }
                else{
                    mainModel.popupMessage("loginPopup", "<div style='text-align: left;'><h3>Login Failed</h3></div><br/><div style='text-align: left;'>Please verify the entered credentials and try again.</div>");
                }
             }).fail(function() {
                console.log('there was an error in login process');
            });
    },

    getAlreadyVotedProjects: function(){

    },

    getProjects: function(alreadyVoted){
        mainModel.set('user', loggedUserId);

        $.ajax({
            dataType: "json",
            data: {id: loggedUserId},
            url: "voters"
        }).done(function(data) {
            console.log(data);

            if(alreadyVoted){
                data.projects = mainModel.sortAlreadyVoted(data.projects, data.user.rating);
            }else{
                data.projects = mainModel.sortNotVoted(data.projects);
            }

            projectsDataSource.data([]);
            projectNameToCodeMap = [];

            $.each(data.projects, function(index, item) {
                console.log(item);
                projectsDataSource.add(item);
                projectNameToCodeMap[item.project_name.trim()] = item.project_code.trim();
            });
            kendoMobileApp.navigate('#projects-view');
        }).fail(function() {
            console.log('there was an error getting the projects list');
        });
    },

    sortNotVoted: function(projects){
        return projects.sort(function(a,b) {
            if (a.project_name < b.project_name) {
                return -1;
            }
            if (a.project_name > b.project_name) {
                return 1;
            }
            return 0;
        });
    },

    sortAlreadyVoted: function(projects, rating){
        var retProjects = [];
        for(var i =0; i < rating.length ; i++ ){
            var project = mainModel.getProjectByCode(projects, rating[i]);
            if(project !== null){
                retProjects.push(project);
            }
        }
        return retProjects;
    },

    getProjectByCode: function(projects, project_code){
        for(var i =0; i < projects.length ; i++ ){
            if(projects[i].project_code == project_code){
                return projects[i];
            }
        }

        return null;
    },
    popupMessage: function(objectId, message){
        var objectName = "#" + objectId;
        $(objectName).find("p").html(message);
        $(objectName).addClass('is-visible');
    },

    submitVote: function(){
 
        var results = [];
        $("#projectsTable").each(function(){
            var phrase = '';
            $(this).find('li').each(function(){
                var current = $(this);
                results.push(projectNameToCodeMap[current.text().trim()]);
                //alert(projectNameToCodeMap[current.text().trim()]);
            });
        });

        mainModel.sendResults(results);
        //alert(results);
        //mainModel.popupMessage('<div><h1>Thank you for voting</h1><p>Join us at the end of Ship It! day to see who won.</p></div>');
        //$("#submit-footer").hide();
    },

    logout:function(){
        loggedUserId = '';
        loggedUserToken = '';
        $("#password").val("");
        kendoMobileApp.navigate('#login-view');
    },
    changeToAlreadyVoted:function(calledFromSubmit){
        $("#submitButton").addClass('invisible-element');
        $("#logoutButton").removeClass('invisible-element');
        if(!calledFromSubmit){
            $("#projectsTable").addClass('invisible-element');
            $("#alreadyRankedTable").removeClass('invisible-element');
        }

        $("#top-message-before-vote").addClass('invisible-element');
        $("#top-message-after-vote").removeClass('invisible-element');

    },

    changeToNotVoted:function(){
        $("#submitButton").removeClass('invisible-element');
        $("#logoutButton").addClass('invisible-element');

        $("#top-message-before-vote").removeClass('invisible-element');
        $("#top-message-after-vote").addClass('invisible-element');

        $("#projectsTable").removeClass('invisible-element');
        $("#alreadyRankedTable").addClass('invisible-element');
    },
    sendResults: function (results){
        var voteData = {};
        voteData.id = loggedUserId;
        voteData.token = loggedUserToken;

        for(var i =0; i < results.length ; i++ ){
            voteData["project" + (i + 1)] = results[i];
        }

        $.ajax({
            dataType: "json",
            data: voteData,
            url: "vote"
        }).done(function(data) {
            console.log(data);
            mainModel.changeToAlreadyVoted(true);
            if (data.error == 3){
                mainModel.popupMessage("projectsPopup", alreadyVotedMessage);
            }else{
                mainModel.popupMessage("projectsPopup", "<div style='z-index:99999;text-align: left;'><h3>Thank you for voting!</h3><div><b>Join us at the end of Ship It day to see who won!</b></div></div>");
            }
        }).fail(function() {
            console.log('there was an error sending the results');
        });
    },

    vote: function() {
        if(!this.voted) {
            $.ajax({
                dataType: "json",
                data: {
                    id: mainModel.user.userName,
                    project: mainModel.project.project_code,
                    token: mainModel.user.emp_number
                },
                url: server + "vote"
            }).done(function(data) {

                this.voted = true;
                if(typeof data.error !== "undefined")
                {
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

    about:function() {
      kendoMobileApp.navigate('#about-view', 'zoom');
    },

    setCookie:function (cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    },

    getCookie:function (cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    }
});

kendoMobileApp = new kendo.mobile.Application(document.body, {
    skin: "flat",
    init: function() {
        'use strict';
        /*
        setTimeout(function() {
            kendo.fx(".splash").fadeOut().duration(700).play();
        }, 1000);
        */

        if(document.location.hash.length>0) {
            document.location.hash='';
        }
    }
});


