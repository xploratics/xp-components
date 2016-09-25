function columnsComparer(a, b) {
    return a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0;
}

module.exports = ['$mdDialog', '$timeout', function ($mdDialog, $timeout) {
    return function (options) {
        var { filters, gridOptions } = options || 0;

        var dialog = {
            bindToController: true,
            clickOutsideToClose: true,
            controller: ['$scope', '$mdDialog', 'filters', 'options', function ($scope, $mdDialog, filters, options) {
                $scope.filters = filters || [];
                $scope.options = options;
                $scope.apply = value => $mdDialog.hide(value);
                $scope.cancel = _ => $mdDialog.cancel();

                $scope.autoCompleteText = '';
                $scope.selectedColumn = null;

                $scope.$watch('options.columnDefs', function (columns) {
                    $scope.columns = [];

                    if (!columns) return;

                    for (var i = 0; i < columns.length; i++)
                        $scope.columns.push(columns[i]);

                    $scope.columns.sort(columnsComparer);

                }, true);

                $scope.removeFilter = function (filter) {
                    var index = $scope.filters.indexOf(filter);
                    if (index !== -1)
                        $scope.filters.splice(index, 1);
                };

                // when a column is selected in the autocomplete
                $scope.selectedColumnChanged = function (selectedColumn) {
                    if (!selectedColumn) return;

                    // add columns to the list of filters for editing.
                    $scope.filters.unshift({ column: selectedColumn });

                    $timeout(function () {
                        // clear the autocomplete
                        $scope.autoCompleteText = '';
                        $scope.selectedColumn = null;

                        angular.element('md-dialog md-list-item input').first().focus();
                    });
                };
            }],
            escapeToClose: true,
            locals: {
                filters: filters || [],
                options: gridOptions
            },
            templateUrl: '/templates/xp-gridfilter-dialog.html'
        };

        return $mdDialog.show(dialog);
    };
}];