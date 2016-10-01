angular
    .module('app', ['xp.components', 'ngMaterial'])
    .controller('app', ['$scope', '$http', '$rootScope', function (scope, $http, $rootScope) {
        scope.options = {
            columnDefs: [
                { field: 'firstName', displayName: 'First Name', width: "*", resizable: false },
                { field: 'lastName', displayName: 'Last Name', width: "20%" },
                { field: 'email', displayName: 'email', width: "*" },
                { field: 'birthDate', displayName: 'Birth Date', width: "*", filterType: 'date' }
            ],
            fetch: function (params) {
                return $http({ url: '/api/users', params }).then(e => e.data);
            }
        };

        $rootScope.currentTheme = 'default';

        var i = 0;

        scope.toggleTheme = function () {
            $rootScope.currentTheme = (++i % 2 === 0) ? 'default' : 'dark';
        };

    }]);