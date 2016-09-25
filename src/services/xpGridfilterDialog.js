function columnsComparer(a, b) {
    return a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0;
}

function loadFilters(columns, filters) {
    var array = [];

    function getColumnByName(name) {
        for (var i = 0; i < columns.length; i++)
            if (columns[i].name === name)
                return columns[i];
    }

    for (var i = 0; i < filters.length; i++) {
        var f = filters[i];

        f.column = getColumnByName(f.name);

        if (f.column)
            array.push(f);
    }

    return array.sort(columnsComparer);
}

function saveFilters(filters) {

    for (var i = 0; i < filters.length; i++) {
        var f = filters[i];
        f.name = f.column.name;
        delete f.column;
    }

    return filters;
}

module.exports = ['$mdDialog', '$timeout', function ($mdDialog, $timeout) {
    return function (options) {
        var { gridOptions } = options;

        var dialog = {
            bindToController: true,
            clickOutsideToClose: true,
            controller: ['$scope', '$mdDialog', function (scope, $mdDialog) {

                scope.columns = gridOptions.columnDefs.slice().sort(columnsComparer);
                scope.filters = loadFilters(scope.columns, gridOptions.filters);

                scope.apply = function (value) {
                    $mdDialog.hide(value);
                    gridOptions.filters = saveFilters(scope.filters);
                };

                scope.cancel = _ => $mdDialog.cancel();
                scope.autoCompleteText = '';
                scope.selectedColumn = null;

                scope.removeFilter = function (filter) {
                    var index = scope.filters.indexOf(filter);
                    if (index !== -1)
                        scope.filters.splice(index, 1);
                };

                // when a column is selected in the autocomplete
                scope.selectedColumnChanged = function (selectedColumn) {
                    if (!selectedColumn) return;

                    // add columns to the list of filters for editing.
                    scope.filters.unshift({
                        column: selectedColumn
                    });

                    $timeout(function () {
                        // clear the autocomplete
                        scope.autoCompleteText = '';
                        scope.selectedColumn = null;

                        angular.element('md-dialog md-list-item input').first().focus();
                    });
                };
            }],
            escapeToClose: true,
            templateUrl: '/templates/xp-gridfilter-dialog.html'
        };

        return $mdDialog.show(dialog);
    };
}];