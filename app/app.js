angular
    .module('app', ['ui.grid', 'xpComponents'])
    .controller('app', ['$scope', function (scope) {
        scope.options = {
            columnDefs: [
                { field: 'firstName', displayName: 'First Name', width: "*", resizable: false },
                { field: 'lastName', displayName: 'Last Name', width: "20%" },
                { field: 'email', displayName: 'email', width: "*" }
            ]
        };
        scope.items = [];

        scope.selectedItemChanged = function (s) {
            console.log(s);
        };
    }]);