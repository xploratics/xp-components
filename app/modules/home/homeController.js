angular
    .module('app')
    .config(['$routeProvider',
        function (routeProvider) {
            routeProvider
                .when('/', {
                    templateUrl: '/app/modules/home/homeView.html',
                    controller: 'homeController'
                });
        }
    ])
    .controller('homeController', ['$scope', '$http', '$location', function (scope, http, location) {
       
       scope.showAutoComplete = function () {
           location.url('/autoComplete');
       };

       scope.showGrid = function () {
           location.url('/grid');
       };
    }]);