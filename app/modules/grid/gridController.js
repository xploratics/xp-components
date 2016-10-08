angular
    .module('app')
    .config(['$routeProvider',
        function (routeProvider) {
            routeProvider
                .when('/grid', {
                    templateUrl: '/app/modules/grid/gridView.html',
                    controller: 'gridController'
                });
        }
    ])
    .controller('gridController', ['$scope', '$http', function (scope, http) {
        scope.options = {
            columnDefs: [{
                field: 'firstName',
                displayName: 'First Name',
                width: "*",
                resizable: false
            }, {
                field: 'lastName',
                displayName: 'Last Name',
                width: "20%"
            }, {
                field: 'email',
                displayName: 'email',
                width: "*"
            }, {
                field: 'birthDate',
                displayName: 'Birth Date',
                width: "*",
                filterType: 'date'
            }],
            //fetch: params => http({ url: '/api/users', params })
            fetch: '/api/users'
        };
    }]);