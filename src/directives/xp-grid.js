module.exports = [function () {
    return {
        restrict: 'E',
        scope: true,
        template: 
        `<div layout="column" class="xp-grid">
            <xp-gridfilter-button xp-grid-options="options" layout="row" layout-align="end center"></xp-gridfilter-button>
            <div ui-grid="options" flex ui-grid-resize-columns ui-grid-move-columns ui-grid-infinite-scroll></div>
        </div>`,
        link: function (scope, element, attrs) {

            var filters;
            var sort;
            var firstPage = 1;
            var lastPage = 1;

            scope.options = scope.$parent.$eval(attrs.xpGridOptions || '{}') || {};

            var options = angular.extend(scope.options, {
                data: [],
                filters: [],
                onRegisterApi: function (gridApi) {
                    scope.options.gridApi = gridApi;
                    gridApi.core.on.sortChanged(scope, sortChanged);
                    sortChanged(gridApi.grid, [options.columnDefs[1]]);

                    if (gridApi.infiniteScroll) {
                        gridApi.infiniteScroll.on.needLoadMoreData(scope, needLoadMoreData);
                        gridApi.infiniteScroll.on.needLoadMoreDataTop(scope, needLoadMoreDataTop);
                    }
                }
            });

            scope.$watch('options.filters', function (filters) {
                if (!filters) return;
            });

            function getState() {
                return {
                    sort
                }
            }

            function needLoadMoreData() {
            }

            function needLoadMoreDataTop() {
                
            }

            function query(state) {

                if (Array.isArray(!options.data))
                    options.data = [];
            }

            function sortChanged(grid, sortColumns) {
                sort = computeSortString(sortColumns);
            }
        }
    }
}];

// function computeFilters(filters) {
//     var o = {};

//     for (var i = 0; i < filters.length; i++) {
//         var f = filters[i];
//         p[f.name] = 
//     }
// }

function computeSortString(sortColumns) {
    var s = '';

    for (var i = 0; i < sortColumns.length; i++) {
        if (s) s += ',';

        var col = sortColumns[i];
        if (col.sort)
            s += col.name + ':' + col.sort.direction;
    }

    return s;
}