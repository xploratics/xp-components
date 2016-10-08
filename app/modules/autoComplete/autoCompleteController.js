angular
    .module('app')
    .config(['$routeProvider',
        function (routeProvider) {
            routeProvider
                .when('/autoComplete', {
                    templateUrl: '/app/modules/autoComplete/autoCompleteView.html',
                    controller: 'autoCompleteController'
                });
        }
    ])
    .controller('autoCompleteController', ['$scope', function (scope) {

        scope.selectedItemChanged = function (s) {
            console.log(s);
        };
    }]);