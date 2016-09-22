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
                <md-dialog class="xp-gridfilter" aria-label="GridFilter" layout-padding>
                    <div class="dialogHeader" flex="auto">
                        <span translate="t.Filters">Filters</span>

                        <xp-autocomplete
                            xp-floating-label="Choose a column"
                            xp-items="columns"
                            xp-item-text="item.displayName"
                            xp-search-text="autoCompleteText"
                            xp-selected-item="selectedColumn"
                            xp-selected-item-change="selectedColumnChanged(item)"/>
                    </div>

                    <md-dialog-content flex="100">
                        <md-list>
                            <md-list-item class="secondary-button-padding" ng-repeat="filter in filters">
                                <ng-include flex="auto" src="'xp-gridfilter-' + (filter.column.filterType || 'string') + '.html'"></ng-include>
                                <md-button aria-label="RemoveFilter" class="md-secondary" ng-click="removeFilter(filter)"><ng-md-icon icon="delete"></ng-md-icon></md-button>
                            </md-list-item>
                        </md-list>
                    </md-dialog-content>

                    <md-dialog-actions flex="auto">
                        <md-button aria-label="DeleteAll" translate="t.DeleteAll" ng-click="filters = []" ng-disabled="!filters.length">Delete All</md-button>
                        <md-button aria-label="Cancel" translate="t.Cancel" ng-click="cancel()">Cancel</md-button>
                        <md-button aria-label="Apply" translate="t.Apply" ng-click="apply(filters)">Apply</md-button>
                    </md-dialog-actions>
                </md-dialog>`
        };

        return $mdDialog.show(dialog);
    };
}];