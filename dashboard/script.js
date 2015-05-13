// create the module and name it dashboardApp
var dashboardApp = angular.module('dashboardApp',  ['ngResource', 'ngRoute', "googlechart"]);

// configure our routes
dashboardApp.config(function ($routeProvider) {
    $routeProvider

        // route for the home page
        .when('/', {
            templateUrl: 'pages/home.html',
            controller: 'mainController'
        })

        // route for the about page
        .when('/about', {
            templateUrl: 'pages/about.html',
            controller: 'aboutController'
        })

        // route for the contact page
        .when('/contact', {
            templateUrl: 'pages/contact.html',
            controller: 'contactController'
        })

        .when('/votes/', {
            templateUrl: 'pages/votes.html',
            controller: 'votesController'
        })
        .when('/projects', {
            templateUrl: 'pages/projects.html',
            controller: 'projectsController'
        })


});

// create the controller and inject Angular's $scope
dashboardApp.controller('mainController', function ($scope) {
    // create a message to display in our view
    $scope.message = 'Everyone come and see how good I look!';
});

dashboardApp.controller('aboutController', function ($scope) {
    $scope.message = 'Look! I am an about page.';
});

dashboardApp.controller('contactController', function ($scope) {
    $scope.message = 'Contact us! JK. This is just a demo.';
});

dashboardApp.controller('votesController', function ($scope, $http, $resource) {

        $scope.global = {
            graphstate: false,
        };

    console.time("Calling Server");

    var Votes = $resource('/votes');
    var ChartData = [];

    Votes.get(function (response) {

        console.timeEnd("Server Returns");

        var round =1;
        if (typeof($scope.votestbl) == 'undefined') {
            $scope.votestbl = [];
        }

        else if($scope.votestbl.length > 0)
        {
            round = 2
        }

        var ChartData = [

        ];

        var item;
        console.time("processing");
        for (var i = 0; i < response.ratingResults.length; i++) {
            item = response.ratingResults[i];

            if (item._id != "") {

                if (typeof(item.project) == undefined)
                    item.project.projectCode = "UNDEF";

                if(round == 1) {
                    $scope.votestbl.push({
                        project_name: item.project_name,
                        projectCode: item.projectCode,
                        value: item.value,
                        weightValue: item.weightValue,
                        weightValue2: item.weightValue2
                    });
                }
                ChartData.push(
                    { c:
                        [
                            { v: item.project_name },
                            { v: item.value },
                            { v: item.weightValue },
                            { v: item.weightValue2 }
                        ]
                    }
                );

            }
        }
        console.timeEnd("processing");

        $scope.chartObject = {};

        $scope.chartObject.data = {"cols": [
            {id: "t", label: "Project", type: "string"},
            {id: "s", label: "Count", type: "number"},
            {id: "s", label: "Weight", type: "number"},
            {id: "s", label: "2...5", type: "number"}
        ], "rows": ChartData};

        // $routeParams.chartType == BarChart or PieChart or ColumnChart...
        $scope.chartObject.type = 'ColumnChart';
        $scope.chartObject.options = {
            'title': 'Voting Summary'
        }
        $scope.global.graphstate = true;
    });
});

dashboardApp.controller('projectsController', function ($scope, $http) {

    $http.get("/projects").success(function (response) {
        $scope.names = response;
    });
    $scope.message = 'Contact us!';

});

dashboardApp.controller('statController', function ($scope, $http, $resource) {

    var Stat = $resource('/stat');

    Stat.get(function (response) {

        $scope.voters = response.db_stat.numberOfVoters;
        $scope.avoters =  response.db_stat.voted;
        if(response.state)
        {
            $scope.vstate = "ON";
        }
        else
        {
            $scope.vstate = "OFF";
        }
    });


});

