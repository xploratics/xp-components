module.exports = ['$q', function ($q) {
    return {
        restrict: 'E',
        scope: true,
        template: `<div layout="column" class="xp-grid">
            <xp-gridfilter-button xp-grid-options="options" layout="row" layout-align="end center"></xp-gridfilter-button>
            <div ui-grid="options" flex ui-grid-resize-columns ui-grid-move-columns ui-grid-infinite-scroll></div>
        </div>`,
        link: function (scope, element, attrs) {

            var filters;
            var sort;
            var mustReload;
            var page = 0;
            var refresh = new Rx.Subject();

            scope.options = scope.$parent.$eval(attrs.xpGridOptions || '{}') || {};

            var options = angular.extend(scope.options, {
                data: [],
                infiniteScrollRowsFromEnd: 100,
                infiniteScrollDown: true,
                onRegisterApi: function (gridApi) {
                    scope.options.gridApi = gridApi;
                    gridApi.core.on.sortChanged(scope, sortChanged);
                    sortChanged(gridApi.grid, [options.columnDefs[1]]);
                    gridApi.infiniteScroll.on.needLoadMoreData(scope, needLoadMoreData);
                }
            });

            scope.$watch('options.columnDefs', function (columns) {
                if (columns) {
                    filters = columns ? computeFilters(columns) : [];
                    refresh.onNext(true);
                }
            });

            function needLoadMoreData() {
                refresh.onNext(false);
            }

            function sortChanged(grid, sortColumns) {
                sort = computeSortString(sortColumns);
                refresh.onNext(true);
            }

            refresh
                .map(e => mustReload |= e)
                .debounce(1)
                .$apply(scope)
                .flatMapLatest(function (reload) {
                    mustReload = false;

                    if (reload) {
                        page = 1;
                        scope.data = [];
                    }

                    var params = angular.extend(filters, {
                        sort,
                        page,
                        pageSize: 100
                    });

                    var result = options.fetch(params);

                    if (!result.subscribe)
                        result = Rx.Observable.fromPromise($q.when(result));

                    return result.catch(_ => Rx.Observable.empty());
                })
                .$apply(scope)
                .tap(function (data) {
                    page++;

                    for (var i = 0; i < data.length; i++)
                        options.data.push(data[i]);

                    scope.options.gridApi.infiniteScroll.dataLoaded(data.length >= 100);
                })
                .subscribe();
        }
    }
}];

function computeFilters(columns) {
    var o = {};

    for (var i = 0; i < columns.length; i++) {
        var column = columns[i];
        var filters = column.filters || [];

        if (filters.length)
            o[column.name] = filters;
    }

    return o;
}

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