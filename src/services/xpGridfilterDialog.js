function columnsComparer(a, b) {
    return a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0;
}

module.exports = ['$mdDialog', function ($mdDialog) {
    return function (options) {
        var { filters, gridOptions } = options || 0;

        var dialog = {
            bindToController: true,
            clickOutsideToClose: true,
            controller: function ($scope, $mdDialog, filters, options) {
                $scope.filters = filters;
                $scope.options = options;
                $scope.apply = value => $mdDialog.hide(value);
                $scope.cancel = _ => $mdDialog.cancel();

                $scope.autoCompleteText = '';
                $scope.filters = [];
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

                    // clear the autocomplete
                    $scope.autoCompleteText = '';
                    $scope.selectedColumn = 0;
                };
            },
            escapeToClose: true,
            locals: {
                filters: filters || [],
                options: gridOptions
            },
            template: `
                <md-dialog layout-padding style="width: 500px">
                    <md-dialog-content>
                        <div class="dialogHeader">
                            <span translate="t.Filters">Filters</span>
                        </div>

                        <md-list>
                            <md-subheader class="md-no-sticky">
                                <xp-autocomplete
                                    xp-items="columns"
                                    xp-item-text="item.displayName"
                                    xp-search-text="autoCompleteText"
                                    xp-selected-item="selectedColumn"
                                    xp-selected-item-change="selectedColumnChanged(item)"/>
                            </md-subheader>
                            
                            <md-list-item class="secondary-button-padding" ng-repeat="filter in filters">
                                <span>{{filter.column.displayName}}</span>
                                <md-button class="md-secondary" ng-click="removeFilter(filter)">X</md-button>
                            </md-list-item>
                        </md-list>
                    </md-dialog-content>

                    <md-dialog-actions>
                        <md-button translate="t.Cancel" ng-click="cancel()"></md-button>
                        <md-button translate="t.Apply" ng-click="apply(filters)"></md-button>
                    </md-dialog-actions>
                </md-dialog>`
        };

        return $mdDialog.show(dialog);
    };
}];