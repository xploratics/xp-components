function columnsComparer(a, b) {
    return a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0;
}

module.exports = [function () {
    return {
        restrict: 'AE',
        scope: true,
        template: `
            <md-dialog>
                <md-dialog-content>
                    <div class="dialogHeader">
                        <span translate="t.AvatarSelection"></span>
                    </div>

                    <xp-autocomplete
                        xp-items="columns"
                        xp-item-text="item.displayName"
                        xp-search-text="autoCompleteText"
                        xp-selected-item="selectedColumn"
                        xp-selected-item-change="selectedColumnChanged(selectedColumn)"
                        layout="row"/>

                    <ul layout="row">
                        <li class="filter-item" ng-repeat="filter in filters">
                            <ng-include src="filter.column.type"></ng-include>
                            <md-button class="remove-filter" ng-click="removeFilter(filter)"><i>X</i></md-button>
                        </li>
                    </ul>
                </md-dialog-content>
                <md-dialog-actions layout="row">
                    <md-button translate="t.Cancel" ng-click="cancel()"></md-button>
                    <md-button translate="t.Apply" ng-click="apply(filters)"></md-button>
                </md-dialog-actions>
            </md-dialog>`,
        link: function (scope, element, attrs) {
            scope.autoCompleteText = '';
            scope.filters = [];
            scope.selectedColumn = 0;

            scope.$watch('options.columnDefs', function (columns) {
                scope.columns = [];
                
                if (!columns) return;

                for (var i = 0; i < columns.length; i++)
                    scope.columns.push(columns[i]);

                scope.columns.sort(columnsComparer);

            }, true);

            scope.removeFilter = function (filter) {
                var index = scope.filters.indexOf(filter);
                if (index !== -1)
                    scope.filters.splice(index, 1);
            };

            // when a column is selected in the autocomplete
            scope.selectedColumnChanged = function (selectedColumn) {
                if (!selectedColumn) return;

                // add columns to the list of filters for editing.
                scope.filters.unshift({ column: selectedColumn });

                // clear the autocomplete
                scope.autoCompleteText = '';
                scope.selectedColumn = 0;
            };
        }
    }
}];