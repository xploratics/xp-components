module.exports = ['xpGridfilterDialog', '$parse', function (xpGridfilterDialog, parse) {
    return {
        scope: true,
        template: `<md-button aria-label="Filter" ng-click="showDialog()" ng-class="{'md-primary': filtered()}">
            <ng-md-icon icon="filter_list"></ng-md-icon>
        </md-button>`,
        link: function (scope, element, attrs) {
            var options = parse(attrs.xpGridOptions);

            scope.filtered = function () {
                var { columnDefs } = options(scope) || 0;
                if (columnDefs)
                    for (var i = 0; i < columnDefs.length; i++)
                        if (columnDefs[i].filters && columnDefs[i].filters.length)
                            return true;
            };

            scope.showDialog = function () {
                var gridOptions = options(scope) || {};
                xpGridfilterDialog({ gridOptions });
            };
        }
    };
}];