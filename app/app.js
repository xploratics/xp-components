angular
    .module('app', ['ngRoute', 'xp.components', 'ngMaterial'])
    .controller('app', ['$scope', '$http', '$rootScope', function (scope, $http, $rootScope) {
        scope.options = {
            columnDefs: [
                { field: 'firstName', displayName: 'First Name', width: "*", resizable: false },
                { field: 'lastName', displayName: 'Last Name', width: "20%" },
                { field: 'email', displayName: 'email', width: "*" },
                { field: 'birthDate', displayName: 'Birth Date', width: "*", filterType: 'date' }
            ],
            fetch: params => $http({ url: '/api/users', params })
            //fetch: '/api/users'
        };

        $rootScope.currentTheme = 'default';

        var i = 0;

        scope.toggleTheme = function () {
            $rootScope.currentTheme = (++i % 2 === 0) ? 'default' : 'dark';
        };

    }]);