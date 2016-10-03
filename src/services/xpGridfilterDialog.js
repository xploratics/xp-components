function columnsComparer(a, b) {
    return a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0;
}

function loadFilters(columns) {
    var result = [];

    for (var i = 0; i < columns.length; i++) {
        var column = columns[i];
        var filters = angular.copy(column.columnDef.filters || []);

        for (var j = 0; j < filters.length; j++) {
            var filter = filters[j];
            filter.column = column;
            result.push(filter);
        }
    }

    return result;
}

function saveFilters(columns, filters) {
    for (var i = 0; i < columns.length; i++)
        columns[i].columnDef.filters = [];

    for (var i = 0; i < filters.length; i++) {
        var filter = filters[i];
        filter.column.columnDef.filters.push(filter);
        delete filter.column;
    }
}

module.exports = ['$mdDialog', '$timeout', function ($mdDialog, $timeout) {
    return function (options) {
        var { gridOptions } = options;

        var dialog = {
            bindToController: true,
            clickOutsideToClose: true,
            controller: ['$scope', '$mdDialog', 'xpGridService', function (scope, $mdDialog, xpGridService) {

                scope.columns = gridOptions
                    .columnDefs
                    .map(columnDef => ({ 
                        columnDef,
                        displayName: xpGridService.getColumnDisplayName(columnDef)
                    }))
                    .sort(columnsComparer);

                scope.filters = loadFilters(scope.columns);

                scope.apply = function (value) {
                    saveFilters(scope.columns, scope.filters);
                    $mdDialog.hide(value);
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

                        var input = document.querySelector('.xp-gridfilter-item input');
                        if (input)
                            input.focus();
                    });
                };
            }],
            escapeToClose: true,
            templateUrl: '/templates/xp-gridfilter-dialog.html'
        };

        return $mdDialog.show(dialog);
    };
}];