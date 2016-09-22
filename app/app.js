angular
    .module('app', ['ui.grid', 'xp.components'])
    .controller('app', ['$scope', function (scope) {
        scope.options = {
            columnDefs: [
                { field: 'firstName', displayName: 'First Name', width: "*", resizable: false },
                { field: 'lastName', displayName: 'Last Name', width: "20%" },
                { field: 'email', displayName: 'email', width: "*" },
                { field: 'birthDate', displayName: 'Birth Date', width: "*", filterType: 'date' }
            ],
            data: [
                {
                    firstName: 'test'
                }
            ]
        };
    }]);