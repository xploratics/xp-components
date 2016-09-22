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
            template: `
                <md-dialog layout-padding style="min-width: 500px">
                    <div class="dialogHeader">
                        <span translate="t.Filters">Filters</span>

                        <xp-autocomplete
                            xp-floating-label="Choose a column"
                            xp-items="columns"
                            xp-item-text="item.displayName"
                            xp-search-text="autoCompleteText"
                            xp-selected-item="selectedColumn"
                            xp-selected-item-change="selectedColumnChanged(item)"/>
                    </div>

                    <md-dialog-content>
                        <md-list>
                            <md-list-item class="secondary-button-padding" ng-repeat="filter in filters">
                                <ng-include flex="auto" src="'xp-gridfilter-' + (filter.column.filterType || 'string') + '.html'"></ng-include>
                                <md-button class="md-secondary" flex="none" ng-click="removeFilter(filter)"><ng-md-icon icon="delete"></ng-md-icon></md-button>
                            </md-list-item>
                        </md-list>
                    </md-dialog-content>

                    <md-dialog-actions>
                        <md-button translate="t.DeleteAll" ng-click="filters = []" ng-disabled="!filters.length">Delete All</md-button>
                        <md-button translate="t.Cancel" ng-click="cancel()">Cancel</md-button>
                        <md-button translate="t.Apply" ng-click="apply(filters)">Apply</md-button>
                    </md-dialog-actions>
                </md-dialog>`
        };

        return $mdDialog.show(dialog);
    };
}];