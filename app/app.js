angular
    .module('app', ['ui.grid', 'ui.grid.resizeColumns', 'ui.grid.moveColumns', 'xp.components'])
    .controller('app', ['$scope', function (scope) {
        scope.options = {
            columnDefs: [
                { field: 'firstName', displayName: 'First Name', width: "*", resizable: false },
                { field: 'lastName', displayName: 'Last Name', width: "20%" },
                { field: 'email', displayName: 'email', width: "*" },
                { field: 'birthDate', displayName: 'Birth Date', width: "*", filterType: 'date' }
            ],
            enableColumnMenus: false,
            data: getData()
        };

        function getData() {
            var array = [];

            for (var i = 0; i < 1000; i++) 
                array.push({ firstName: 'Fname'+ i, lastName: 'Lname' + i });

            return array;
        }
    }]);