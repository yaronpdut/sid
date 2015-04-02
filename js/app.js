/*global kendo */
//1.  Cleanup model
//2.  Login error messages
//3.  Voting error messages


var projectsDataSource = new kendo.data.DataSource({
}),

server = "http://localhost:8080/",

kendoMobileApp,

mainModel =  kendo.observable({
    voted: false,
    user: {},
    round:0,
    project:{description:'george'},
    bob:'scott',

    login: function(){
        'use strict';

        var username = $("#username").val(),
            password = $("#password").val();
            $.ajax({
                dataType: "json",
                url: server + "voters?id=" + username
            }).done(function(data) {
                console.log(data);
                console.log(data.user.emp_number, password);
                if(data.user) {
                    if(data.user.emp_number==password) {
                        console.log('1');
                        mainModel.round = data.round;
                        mainModel.user = data.user;

                        data.projects.sort(function(a,b) {
                            if (a.project_name < b.project_name) {
                                return -1;
                            }
                            if (a.project_name > b.project_name) {
                                return 1;
                            }
                            return 0;
                        });

                        console.log('2');

                        $.each(data.projects, function(index, item) {
                            if(data.user.voted.length>0 && item.project_code===data.user.voted) {
                                mainModel.set('project', item);
                            }
                            projectsDataSource.add(item);
                        });

                        console.log('3');

                        //todo fix
                        if(data.user.voted.length>0) {
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


