/*global kendo */
//1.  Cleanup model
//2.  Login error messages
//3.  Voting error messages


var projectsDataSource = new kendo.data.DataSource({
}),

//server = "http://nsdv-sidv.rhcloud.com//",
server = "http://127.0.0.1:8080/",

kendoMobileApp,

mainModel =  kendo.observable({
    voted: false,
    user: {},
    round:0,
    project:{description:''},
    bob:'scott',

    login: function(){
        'use strict';

        var username = $("#username").val(),
            password = $("#password").val();
            $.ajax({
                dataType: "json",
                data: {id: username},
                url: "voters"
            }).done(function(data) {
                console.log(data);
                if(data.user) {
                    if(data.user.emp_number==password) {
                        mainModel.round = data.round;
                        mainModel.set('user', data.user);

                        data.projects.sort(function(a,b) {
                            if (a.project_name < b.project_name) {
                                return -1;
                            }
                            if (a.project_name > b.project_name) {
                                return 1;
                            }
                            return 0;
                        });

                        $.each(data.projects, function(index, item) {
                            if(data.user.voted.length>0 && item.project_code===data.user.voted) {
                                mainModel.set('project', item);
                            }
                            projectsDataSource.add(item);
                        });

                        if(data.user.voted.length>0) {
                            $("#thankYou").text("It seems like you already voted!")
                            kendoMobileApp.navigate('#voted-view', 'zoom');
                        } else {
                            kendoMobileApp.navigate('#projects-view', 'zoom');
                        }
                    }
                } else {
                    alert('Login failed');
                }
            }).fail(function() {
            });
    },

    showDetail:function(row) {
        mainModel.set('project', row.dataItem);
        kendoMobileApp.navigate('#details-view');
        $("#backbutton").show();
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


