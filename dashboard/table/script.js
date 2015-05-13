var app = angular.module('main', ['ngTable']).
    controller('DemoCtrl', function($scope, $http, $filter, ngTableParams) {

    var data = [
        { project_name: "A",
            projectCode: 1,
            value: 1,
            weightValue: 1,
            weightValue2: 1}];

        $http.get("/votes").success(function (response) {
            console.log (response);

            var items = [];

            var item;
            for (var i = 0; i < response.ratingResults.length; i++) {
                item = response.ratingResults[i];

                if (item._id != "") {

                    if (typeof(item.project) == undefined)
                        item.project.projectCode = "UNDEF";

                    items.push({
                        project_name: item.project_name,
                        projectCode: item.projectCode,
                        value: item.value,
                        weightValue: item.weightValue,
                        weightValue2: item.weightValue2
                    });
                }
            }

            $scope.tableParams = new ngTableParams(
                {
                page: 1,
                count: 5,
                sorting: { weightValue: 'asc'
                }},
                {
                total: data.length,
                getData: function($defer, params) {
                    $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
            });
        });

    });