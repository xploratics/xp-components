angular
    .module('app')
    .controller('autoComplete', ['$scope', function (scope) {
        scope.options = {
            columnDefs: [
                { field: 'firstName', displayName: 'First Name', width: "*", resizable: false },
                { field: 'lastName', displayName: 'Last Name', width: "20%" },
                { field: 'email', displayName: 'email', width: "*" }
            ]
        };

        scope.selectedItemChanged = function (s) {
            console.log(s);
        };
    }]);