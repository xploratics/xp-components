angular
    .module('app', ['xp.components'])
    .controller('app', ['$scope', '$http', function (scope, http) {
        scope.options = {
            columnDefs: [
                { field: 'firstName', displayName: 'First Name', width: "*", resizable: false },
                { field: 'lastName', displayName: 'Last Name', width: "20%" },
                { field: 'email', displayName: 'email', width: "*" },
                { field: 'birthDate', displayName: 'Birth Date', width: "*", filterType: 'date' }
            ],
            fetch: function (params) {
                return http({ url: '/api/users', method: 'GET', params }).then(e => e.data);
            }
        };

        function getData() {
            var array = [];

            for (var i = 0; i < 100; i++)
                array.push({ firstName: 'Fname' + i, lastName: 'Lname' + i });

            return array;
        }

    }]);