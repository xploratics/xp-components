(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function searchableString(a) {
    return (a || '').toLowerCase();
}

/// example
///
///     <xp-autocomplete xp-items="item in items" xp-item-text="item.display"></xp-autocomplete>
///

module.exports = ['$parse', function ($parse) {
    return {
        restrict: 'E',
        scope: {
            xpItems: '=?',
            xpSearchText: '=?',
            xpSelectedItem: '=?',
            xpFloatingLabel: '@'
        },
        template: function template(element, attrs) {
            return '<md-autocomplete\n                md-items="item in _items"\n                md-item-text="' + attrs.xpItemText + '"\n                md-search-text="xpSearchText"\n                md-search-text-change="' + attrs.xpSearchTextChange + '"\n                md-selected-item="xpSelectedItem"\n                md-selected-item-change="selectedItemChange(xpSelectedItem)"\n                md-min-length="0"\n                md-autoselect="true"\n                md-match-case-insensitive="true"\n                md-floating-label="{{xpFloatingLabel}}">\n                    <md-item-template>\n                        <span md-highlight-text="xpSearchText" md-highlight-flags="i">{{' + attrs.xpItemText + '}}</span>\n                    </md-item-template>\n            </md-autocomplete>';
        },
        link: function link(scope, element, attrs) {
            var getItemText = $parse(attrs.xpItemText);
            var items;

            scope._items = [];
            scope._search_text = '';

            scope.selectedItemChange = function (item) {
                return scope.$parent.$eval(attrs.xpSelectedItemChange, { item: item });
            };

            scope.$watch('[xpItems,xpSearchText]', function (e) {
                var items = e[0] || [];
                var text = e[1] || '';
                var array = [];

                text = searchableString(text);

                for (var i = 0; i < items.length; i++) {
                    if (!text || searchableString(getItemText(scope, { item: items[i] })).indexOf(text) !== -1) array.push(items[i]);
                }scope._items = array;
            }, true);
        }
    };
}];

},{}],2:[function(require,module,exports){
'use strict';

module.exports = ['$q', '$http', function ($q, $http) {
    return {
        restrict: 'E',
        scope: true,
        template: '<div layout="column" class="xp-grid">\n            <xp-gridfilter-button xp-grid-options="options" layout="row" layout-align="end center"></xp-gridfilter-button>\n            <div ui-grid="options" flex ui-grid-resize-columns ui-grid-move-columns ui-grid-infinite-scroll></div>\n        </div>',
        link: function link(scope, element, attrs) {

            var sort;
            var mustReload;
            var page = 0;
            var refresh = new Rx.Subject();

            scope.options = scope.$parent.$eval(attrs.xpGridOptions || '{}') || {};

            var options = angular.extend(scope.options, {
                data: [],
                infiniteScrollRowsFromEnd: 100,
                infiniteScrollDown: true,
                onRegisterApi: function onRegisterApi(gridApi) {
                    scope.options.gridApi = gridApi;
                    gridApi.core.on.sortChanged(scope, sortChanged);
                    sortChanged(gridApi.grid, [options.columnDefs[1]]);
                    gridApi.infiniteScroll.on.needLoadMoreData(scope, needLoadMoreData);
                }
            });

            options.refresh = function (_) {
                return refresh.onNext(true);
            };

            scope.$watch('options.columnDefs', function (columns) {
                return scope.filters = computeFilters(columns);
            }, true);
            scope.$watch('filters', function (_) {
                return refresh.onNext(true);
            }, true);

            scope.rowClick = function rowClick(e) {
                options.selectedRow = e.row;

                if (options.rowClick) options.rowClick(e);
            };

            function needLoadMoreData() {
                refresh.onNext(false);
            }

            function sortChanged(grid, sortColumns) {
                sort = computeSortString(sortColumns);
                refresh.onNext(true);
            }

            refresh.map(function (e) {
                return mustReload |= e;
            }).debounce(1).$apply(scope).flatMapLatest(function (reload) {
                mustReload = false;

                if (reload) {
                    page = 1;
                    options.data = [];
                    options.selectedRow = null;
                }

                var params = angular.extend({ page: page, sort: sort, pageSize: 100 }, scope.filters);
                var result = typeof options.fetch === 'string' ? $http({ url: options.fetch, params: params }) : options.fetch(params);

                if (!result.subscribe) result = Rx.Observable.fromPromise($q.when(result));

                return result.catch(function (_) {
                    return Rx.Observable.empty();
                });
            }).$apply(scope).tap(function (data) {
                if (data.data) data = data.data;
                page++;
                options.data = options.data.concat(data);
                scope.options.gridApi.infiniteScroll.dataLoaded(false, data.length >= 100);
            }).subscribe();
        }
    };
}];

function computeFilters(columns) {
    var o = {};

    if (columns) for (var i = 0; i < columns.length; i++) {
        var column = columns[i];
        var filters = column.filters || [];

        if (filters.length) o[column.name] = filters;
    }

    return o;
}

function computeSortString(sortColumns) {
    var s = '';

    for (var i = 0; i < sortColumns.length; i++) {
        if (s) s += ',';

        var col = sortColumns[i];
        if (col.sort) s += col.name + ':' + col.sort.direction;
    }

    return s;
}

},{}],3:[function(require,module,exports){
'use strict';

module.exports = ['xpGridfilterDialog', '$parse', function (xpGridfilterDialog, parse) {
    return {
        scope: true,
        template: '<md-button aria-label="Filter" ng-click="showDialog()" ng-class="{\'md-primary\': filtered()}">\n            <ng-md-icon icon="filter_list"></ng-md-icon>\n        </md-button>',
        link: function link(scope, element, attrs) {
            var options = parse(attrs.xpGridOptions);

            scope.filtered = function () {
                var _ref = options(scope) || 0;

                var columnDefs = _ref.columnDefs;

                if (columnDefs) for (var i = 0; i < columnDefs.length; i++) {
                    if (columnDefs[i].filters && columnDefs[i].filters.length) return true;
                }
            };

            scope.showDialog = function () {
                var gridOptions = options(scope) || {};
                xpGridfilterDialog({ gridOptions: gridOptions });
            };
        }
    };
}];

},{}],4:[function(require,module,exports){
'use strict';

module.exports = ['xpComponentsTranslateService', function (service) {
    return function xpComponentsTranslate(value) {
        return service(value.substring(2)) || value;
    };
}];

},{}],5:[function(require,module,exports){
'use strict';

module.exports = [function () {

    var current = 'en';

    var f = function f(key) {
        return f.locales[current][key];
    };

    f.lang = function (lang) {
        if (!lang) return current;
        current = lang;
    };

    f.locales = {
        en: {
            Apply: 'Apply',
            Cancel: 'Cancel',
            ChooseAColumn: 'Choose a column',
            DeleteAll: 'Delete All',
            Filters: 'Filters',
            From: 'From',
            To: 'To'
        },
        fr: {
            Apply: 'Appliquer',
            Cancel: 'Annuler',
            ChooseAColumn: 'Choisissez une colonne',
            DeleteAll: 'Supprimer tout',
            Filters: 'Filtres',
            From: 'De',
            To: 'À'
        }
    };

    return f;
}];

},{}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

module.exports = ['$filter', function ($filter) {
    var XpGridService = function () {
        function XpGridService() {
            _classCallCheck(this, XpGridService);
        }

        _createClass(XpGridService, [{
            key: 'getColumnDisplayName',
            value: function getColumnDisplayName(columnDef) {
                var result = angular.isUndefined(columnDef.displayName) ? columnDef.field : columnDef.displayName;

                if (columnDef.headerCellFilter) result = $filter(columnDef.headerCellFilter)(result);

                return result;
            }
        }]);

        return XpGridService;
    }();

    return new XpGridService();
}];

},{}],7:[function(require,module,exports){
'use strict';

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
    for (var i = 0; i < columns.length; i++) {
        columns[i].columnDef.filters = [];
    }for (var i = 0; i < filters.length; i++) {
        var filter = filters[i];
        filter.column.columnDef.filters.push(filter);
        delete filter.column;
    }
}

module.exports = ['$mdDialog', '$timeout', function ($mdDialog, $timeout) {
    return function (options) {
        var gridOptions = options.gridOptions;


        var dialog = {
            bindToController: true,
            clickOutsideToClose: true,
            controller: ['$scope', '$mdDialog', 'xpGridService', function (scope, $mdDialog, xpGridService) {

                scope.columns = gridOptions.columnDefs.map(function (columnDef) {
                    return {
                        columnDef: columnDef,
                        displayName: xpGridService.getColumnDisplayName(columnDef)
                    };
                }).sort(columnsComparer);

                scope.filters = loadFilters(scope.columns);

                scope.apply = function (value) {
                    saveFilters(scope.columns, scope.filters);
                    $mdDialog.hide(value);
                };

                scope.cancel = function (_) {
                    return $mdDialog.cancel();
                };
                scope.autoCompleteText = '';
                scope.selectedColumn = null;

                scope.removeFilter = function (filter) {
                    var index = scope.filters.indexOf(filter);
                    if (index !== -1) scope.filters.splice(index, 1);
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
                        if (input) input.focus();
                    });
                };
            }],
            escapeToClose: true,
            templateUrl: '/templates/xp-gridfilter-dialog.html'
        };

        return $mdDialog.show(dialog);
    };
}];

},{}],8:[function(require,module,exports){
'use strict';

require('./xp-gridfilter-date.html');
require('./xp-gridfilter-dialog.html');
require('./xp-gridfilter-number.html');
require('./xp-gridfilter-string.html');

var uiGridHeaderCell = require('./uiGridHeaderCell.html');
var uiGridRow = require('./ui-grid-row.html');
var uiGridHeader = require('./ui-grid-header.html');

module.exports = ['$templateCache', function ($templateCache) {
    //Replace ui-grid templates 
    $templateCache.put('ui-grid/uiGridHeaderCell', $templateCache.get(uiGridHeaderCell));
    $templateCache.put('ui-grid/ui-grid-row', $templateCache.get(uiGridRow));
    $templateCache.put('ui-grid/ui-grid-header', $templateCache.get(uiGridHeader));
}];

},{"./ui-grid-header.html":9,"./ui-grid-row.html":10,"./uiGridHeaderCell.html":11,"./xp-gridfilter-date.html":12,"./xp-gridfilter-dialog.html":13,"./xp-gridfilter-number.html":14,"./xp-gridfilter-string.html":15}],9:[function(require,module,exports){
var ngModule;
try {
  ngModule = angular.module('xp.components');
} catch (e) {
  ngModule = angular.module('xp.components', []);
}

ngModule.run(['$templateCache', function ($templateCache) {
  $templateCache.put('/templates/ui-grid-header.html',
    '<div\n' +
    '  role="rowgroup"\n' +
    '  class="ui-grid-header"> <!-- theader -->\n' +
    '  <div\n' +
    '    class="ui-grid-top-panel">\n' +
    '    <div\n' +
    '      class="ui-grid-header-viewport">\n' +
    '      <div\n' +
    '        class="ui-grid-header-canvas">\n' +
    '        <div\n' +
    '          class="ui-grid-header-cell-wrapper"\n' +
    '          ng-style="colContainer.headerCellWrapperStyle()">\n' +
    '          <div\n' +
    '            role="row"\n' +
    '            class="ui-grid-header-cell-row">\n' +
    '            <div\n' +
    '              class="ui-grid-header-cell ui-grid-clearfix"\n' +
    '              ng-repeat="col in colContainer.renderedColumns track by col.uid"\n' +
    '              ui-grid-header-cell\n' +
    '              md-colors="::{background: \'background\'}"\n' +
    '              col="col"\n' +
    '              render-index="$index">\n' +
    '            </div>\n' +
    '          </div>\n' +
    '        </div>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</div>');
}]);

module.exports = "/templates/ui-grid-header.html";
},{}],10:[function(require,module,exports){
var ngModule;
try {
  ngModule = angular.module('xp.components');
} catch (e) {
  ngModule = angular.module('xp.components', []);
}

ngModule.run(['$templateCache', function ($templateCache) {
  $templateCache.put('/templates/ui-grid-row.html',
    '<div ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ui-grid-one-bind-id-grid="rowRenderIndex + \'-\' + col.uid + \'-cell\'"\n' +
    '    class="ui-grid-cell" ng-class="{ \'ui-grid-row-header-cell\': col.isRowHeader }" md-colors="::{background: \'background-hue-\' + (rowRenderIndex % 2 + 1)}" role="{{col.isRowHeader ? \'rowheader\' : \'gridcell\'}}"\n' +
    '    ui-grid-cell ng-click="$parent.$parent.$parent.$parent.$parent.$parent.$parent.rowClick({ event: $event, row: row, col: col })">\n' +
    '</div>');
}]);

module.exports = "/templates/ui-grid-row.html";
},{}],11:[function(require,module,exports){
var ngModule;
try {
  ngModule = angular.module('xp.components');
} catch (e) {
  ngModule = angular.module('xp.components', []);
}

ngModule.run(['$templateCache', function ($templateCache) {
  $templateCache.put('/templates/uiGridHeaderCell.html',
    '<div\n' +
    '  role="columnheader"\n' +
    '  ng-class="{ \'sortable\': sortable }"\n' +
    '  ui-grid-one-bind-aria-labelledby-grid="col.uid + \'-header-text \' + col.uid + \'-sortdir-text\'"\n' +
    '  aria-sort="{{col.sort.direction == asc ? \'ascending\' : ( col.sort.direction == desc ? \'descending\' : (!col.sort.direction ? \'none\' : \'other\'))}}">\n' +
    '  <md-button\n' +
    '    role="button"\n' +
    '    tabindex="0"\n' +
    '    class="ui-grid-cell-contents ui-grid-header-cell-primary-focus"\n' +
    '    col-index="renderIndex"\n' +
    '    title="TOOLTIP">\n' +
    '    <span\n' +
    '      class="ui-grid-header-cell-label"\n' +
    '      ui-grid-one-bind-id-grid="col.uid + \'-header-text\'">\n' +
    '      {{ col.displayName CUSTOM_FILTERS }}\n' +
    '    </span>\n' +
    '\n' +
    '    <span\n' +
    '      ui-grid-one-bind-id-grid="col.uid + \'-sortdir-text\'"\n' +
    '      ui-grid-visible="col.sort.direction"\n' +
    '      aria-label="{{getSortDirectionAriaLabel()}}">\n' +
    '      <i\n' +
    '       ng-class="{ \'ui-grid-icon-up-dir\': col.sort.direction == asc, \'ui-grid-icon-down-dir\': col.sort.direction == desc, \'ui-grid-icon-blank\': !col.sort.direction }"\n' +
    '       title="{{isSortPriorityVisible() ? i18n.headerCell.priority + \' \' + ( col.sort.priority + 1 )  : null}}"\n' +
    '       aria-hidden="true">\n' +
    '     </i>\n' +
    '     <sub\n' +
    '       ui-grid-visible="isSortPriorityVisible()"\n' +
    '       class="ui-grid-sort-priority-number">\n' +
    '       {{col.sort.priority + 1}}\n' +
    '     </sub>\n' +
    '    </span>\n' +
    '  </md-button>\n' +
    '\n' +
    '  <div ui-grid-filter></div>\n' +
    '</div>');
}]);

module.exports = "/templates/uiGridHeaderCell.html";
},{}],12:[function(require,module,exports){
var ngModule;
try {
  ngModule = angular.module('xp.components');
} catch (e) {
  ngModule = angular.module('xp.components', []);
}

ngModule.run(['$templateCache', function ($templateCache) {
  $templateCache.put('/templates/xp-gridfilter-date.html',
    '<div layout="row" layout-align="center center">\n' +
    '    <label ng-bind="filter.column.displayName"></label>\n' +
    '    <md-input-container>\n' +
    '        <label>{{\'t.From\' | xpComponentsTranslate}}</label>\n' +
    '        <md-datepicker ng-model="filter.from" ng-change="filter.to = filter.from && filter.to && filter.to < filter.from ? filter.from : filter.to"></md-datepicker>\n' +
    '    </md-input-container>\n' +
    '    <md-input-container>\n' +
    '        <label>{{\'t.To\' | xpComponentsTranslate}}</label>\n' +
    '        <md-datepicker ng-model="filter.to" ng-change="filter.from = filter.from && filter.to && filter.from > filter.to ? filter.to : filter.from"></md-datepicker>\n' +
    '    </md-input-container>\n' +
    '</div>');
}]);

module.exports = "/templates/xp-gridfilter-date.html";
},{}],13:[function(require,module,exports){
var ngModule;
try {
  ngModule = angular.module('xp.components');
} catch (e) {
  ngModule = angular.module('xp.components', []);
}

ngModule.run(['$templateCache', function ($templateCache) {
  $templateCache.put('/templates/xp-gridfilter-dialog.html',
    '<md-dialog class="xp-gridfilter" aria-label="GridFilter" layout-padding>\n' +
    '    <div class="dialogHeader" flex="auto">\n' +
    '        <span>{{\'t.Filters\' | xpComponentsTranslate }}</span>\n' +
    '\n' +
    '        <xp-autocomplete\n' +
    '            xp-floating-label="{{ \'t.ChooseAColumn\' | xpComponentsTranslate }}"\n' +
    '            xp-items="columns"\n' +
    '            xp-item-text="item.displayName"\n' +
    '            xp-search-text="autoCompleteText"\n' +
    '            xp-selected-item="selectedColumn"\n' +
    '            xp-selected-item-change="selectedColumnChanged(item)"/>\n' +
    '    </div>\n' +
    '\n' +
    '    <md-dialog-content flex="100">\n' +
    '        <md-list>\n' +
    '            <md-list-item class="secondary-button-padding xp-gridfilter-item" ng-repeat="filter in filters">\n' +
    '                <ng-include flex="auto" src="\'/templates/xp-gridfilter-\' + (filter.column.columnDef.filterType || \'string\') + \'.html\'"></ng-include>\n' +
    '                <md-button aria-label="RemoveFilter" class="md-secondary" ng-click="removeFilter(filter)"><ng-md-icon icon="delete"></ng-md-icon></md-button>\n' +
    '            </md-list-item>\n' +
    '        </md-list>\n' +
    '    </md-dialog-content>\n' +
    '\n' +
    '    <md-dialog-actions flex="auto">\n' +
    '        <md-button aria-label="DeleteAll" ng-click="filters = []" ng-disabled="!filters.length">{{\'t.DeleteAll\' | xpComponentsTranslate}}</md-button>\n' +
    '        <md-button aria-label="Cancel" ng-click="cancel()">{{\'t.Cancel\' | xpComponentsTranslate}}</md-button>\n' +
    '        <md-button aria-label="Apply" ng-click="apply(filters)">{{\'t.Apply\' | xpComponentsTranslate}}</md-button>\n' +
    '    </md-dialog-actions>\n' +
    '</md-dialog>');
}]);

module.exports = "/templates/xp-gridfilter-dialog.html";
},{}],14:[function(require,module,exports){
var ngModule;
try {
  ngModule = angular.module('xp.components');
} catch (e) {
  ngModule = angular.module('xp.components', []);
}

ngModule.run(['$templateCache', function ($templateCache) {
  $templateCache.put('/templates/xp-gridfilter-number.html',
    '<div layout="row" layout-align="center center">\n' +
    '    <label ng-bind="filter.column.displayName"></label>\n' +
    '    <md-input-container>\n' +
    '        <label>{{\'t.From\' | xpComponentsTranslate}}</label>\n' +
    '        <md-input ng-model="filter.from"></md-input>\n' +
    '    </md-input-container>\n' +
    '    <md-input-container>\n' +
    '        <label>{{\'t.To\' | xpComponentsTranslate}}</label>\n' +
    '        <md-input ng-model="filter.to"></md-input>\n' +
    '    </md-input-container>\n' +
    '</div>');
}]);

module.exports = "/templates/xp-gridfilter-number.html";
},{}],15:[function(require,module,exports){
var ngModule;
try {
  ngModule = angular.module('xp.components');
} catch (e) {
  ngModule = angular.module('xp.components', []);
}

ngModule.run(['$templateCache', function ($templateCache) {
  $templateCache.put('/templates/xp-gridfilter-string.html',
    '<md-input-container class="md-block">\n' +
    '  <label ng-bind="filter.column.displayName"></label>\n' +
    '  <input type="text" ng-model="filter.value" required>\n' +
    '</md-input-container>');
}]);

module.exports = "/templates/xp-gridfilter-string.html";
},{}],16:[function(require,module,exports){
"use strict";

Rx.Observable.prototype.$apply = function (scope, thisArg) {
    var self = this;
    return new Rx.AnonymousObservable(function (observer) {
        return self.subscribe(function (e) {
            scope.$apply(function () {
                observer.onNext(e);
            });
        }, observer.onError.bind(observer), observer.onCompleted.bind(observer));
    });
};

},{}],17:[function(require,module,exports){
'use strict';

angular.module('xp.components', ['ngMaterial', 'ngMdIcons', 'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.moveColumns', 'ui.grid.infiniteScroll'])

// directives
.directive('xpAutocomplete', require('./directives/xp-autocomplete')).directive('xpGrid', require('./directives/xp-grid')).directive('xpGridfilterButton', require('./directives/xp-gridfilter-button'))

// filters
.filter('xpComponentsTranslate', require('./filters/xpComponentsTranslate'))

// services  
.factory('xpGridfilterDialog', require('./services/xpGridfilterDialog')).factory('xpGridService', require('./services/xpGridService')).factory('xpComponentsTranslateService', require('./services/xpComponentsTranslateService'))

// templates
.run(require('./templates'));

require('./utils/rx');

},{"./directives/xp-autocomplete":1,"./directives/xp-grid":2,"./directives/xp-gridfilter-button":3,"./filters/xpComponentsTranslate":4,"./services/xpComponentsTranslateService":5,"./services/xpGridService":6,"./services/xpGridfilterDialog":7,"./templates":8,"./utils/rx":16}]},{},[17])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGRpcmVjdGl2ZXNcXHhwLWF1dG9jb21wbGV0ZS5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZC5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZGZpbHRlci1idXR0b24uanMiLCJzcmNcXGZpbHRlcnNcXHhwQ29tcG9uZW50c1RyYW5zbGF0ZS5qcyIsInNyY1xcc2VydmljZXNcXHhwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UuanMiLCJzcmNcXHNlcnZpY2VzXFx4cEdyaWRTZXJ2aWNlLmpzIiwic3JjXFxzZXJ2aWNlc1xceHBHcmlkZmlsdGVyRGlhbG9nLmpzIiwic3JjXFx0ZW1wbGF0ZXNcXGluZGV4LmpzIiwic3JjL3RlbXBsYXRlcy91aS1ncmlkLWhlYWRlci5odG1sIiwic3JjL3RlbXBsYXRlcy91aS1ncmlkLXJvdy5odG1sIiwic3JjL3RlbXBsYXRlcy91aUdyaWRIZWFkZXJDZWxsLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGF0ZS5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLW51bWJlci5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sIiwic3JjXFx1dGlsc1xccnguanMiLCJzcmNcXGxpYi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUEsU0FBUyxnQkFBVCxDQUEwQixDQUExQixFQUE2QjtBQUN6QixXQUFPLENBQUMsS0FBSyxFQUFOLEVBQVUsV0FBVixFQUFQO0FBQ0g7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLENBQUMsUUFBRCxFQUFXLFVBQVUsTUFBVixFQUFrQjtBQUMxQyxXQUFPO0FBQ0gsa0JBQVUsR0FEUDtBQUVILGVBQU87QUFDSCxxQkFBUyxJQUROO0FBRUgsMEJBQWMsSUFGWDtBQUdILDRCQUFnQixJQUhiO0FBSUgsNkJBQWlCO0FBSmQsU0FGSjtBQVFILGtCQUFVLGtCQUFVLE9BQVYsRUFBbUIsS0FBbkIsRUFBMEI7QUFDaEMsbUhBRW9CLE1BQU0sVUFGMUIsaUdBSTZCLE1BQU0sa0JBSm5DLGljQVk4RSxNQUFNLFVBWnBGO0FBZUgsU0F4QkU7QUF5QkgsY0FBTSxjQUFVLEtBQVYsRUFBaUIsT0FBakIsRUFBMEIsS0FBMUIsRUFBaUM7QUFDbkMsZ0JBQUksY0FBYyxPQUFPLE1BQU0sVUFBYixDQUFsQjtBQUNBLGdCQUFJLEtBQUo7O0FBRUEsa0JBQU0sTUFBTixHQUFlLEVBQWY7QUFDQSxrQkFBTSxZQUFOLEdBQXFCLEVBQXJCOztBQUVBLGtCQUFNLGtCQUFOLEdBQTJCO0FBQUEsdUJBQVEsTUFBTSxPQUFOLENBQWMsS0FBZCxDQUFvQixNQUFNLG9CQUExQixFQUFnRCxFQUFFLFVBQUYsRUFBaEQsQ0FBUjtBQUFBLGFBQTNCOztBQUVBLGtCQUFNLE1BQU4sMkJBQXVDLFVBQVUsQ0FBVixFQUFhO0FBQ2hELG9CQUFJLFFBQVEsRUFBRSxDQUFGLEtBQVEsRUFBcEI7QUFDQSxvQkFBSSxPQUFPLEVBQUUsQ0FBRixLQUFRLEVBQW5CO0FBQ0Esb0JBQUksUUFBUSxFQUFaOztBQUVBLHVCQUFPLGlCQUFpQixJQUFqQixDQUFQOztBQUVBLHFCQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksTUFBTSxNQUExQixFQUFrQyxHQUFsQztBQUNJLHdCQUFJLENBQUMsSUFBRCxJQUFTLGlCQUFpQixZQUFZLEtBQVosRUFBbUIsRUFBRSxNQUFNLE1BQU0sQ0FBTixDQUFSLEVBQW5CLENBQWpCLEVBQXlELE9BQXpELENBQWlFLElBQWpFLE1BQTJFLENBQUMsQ0FBekYsRUFDSSxNQUFNLElBQU4sQ0FBVyxNQUFNLENBQU4sQ0FBWDtBQUZSLGlCQUlBLE1BQU0sTUFBTixHQUFlLEtBQWY7QUFFSCxhQWJELEVBYUcsSUFiSDtBQWNIO0FBaERFLEtBQVA7QUFrREgsQ0FuRGdCLENBQWpCOzs7OztBQ1RBLE9BQU8sT0FBUCxHQUFpQixDQUFDLElBQUQsRUFBTyxPQUFQLEVBQWdCLFVBQVUsRUFBVixFQUFjLEtBQWQsRUFBcUI7QUFDbEQsV0FBTztBQUNILGtCQUFVLEdBRFA7QUFFSCxlQUFPLElBRko7QUFHSCx5VEFIRztBQU9ILGNBQU0sY0FBVSxLQUFWLEVBQWlCLE9BQWpCLEVBQTBCLEtBQTFCLEVBQWlDOztBQUVuQyxnQkFBSSxJQUFKO0FBQ0EsZ0JBQUksVUFBSjtBQUNBLGdCQUFJLE9BQU8sQ0FBWDtBQUNBLGdCQUFJLFVBQVUsSUFBSSxHQUFHLE9BQVAsRUFBZDs7QUFFQSxrQkFBTSxPQUFOLEdBQWdCLE1BQU0sT0FBTixDQUFjLEtBQWQsQ0FBb0IsTUFBTSxhQUFOLElBQXVCLElBQTNDLEtBQW9ELEVBQXBFOztBQUVBLGdCQUFJLFVBQVUsUUFBUSxNQUFSLENBQWUsTUFBTSxPQUFyQixFQUE4QjtBQUN4QyxzQkFBTSxFQURrQztBQUV4QywyQ0FBMkIsR0FGYTtBQUd4QyxvQ0FBb0IsSUFIb0I7QUFJeEMsK0JBQWUsdUJBQVUsT0FBVixFQUFtQjtBQUM5QiwwQkFBTSxPQUFOLENBQWMsT0FBZCxHQUF3QixPQUF4QjtBQUNBLDRCQUFRLElBQVIsQ0FBYSxFQUFiLENBQWdCLFdBQWhCLENBQTRCLEtBQTVCLEVBQW1DLFdBQW5DO0FBQ0EsZ0NBQVksUUFBUSxJQUFwQixFQUEwQixDQUFDLFFBQVEsVUFBUixDQUFtQixDQUFuQixDQUFELENBQTFCO0FBQ0EsNEJBQVEsY0FBUixDQUF1QixFQUF2QixDQUEwQixnQkFBMUIsQ0FBMkMsS0FBM0MsRUFBa0QsZ0JBQWxEO0FBQ0g7QUFUdUMsYUFBOUIsQ0FBZDs7QUFZQSxvQkFBUSxPQUFSLEdBQWtCO0FBQUEsdUJBQUssUUFBUSxNQUFSLENBQWUsSUFBZixDQUFMO0FBQUEsYUFBbEI7O0FBRUEsa0JBQU0sTUFBTixDQUFhLG9CQUFiLEVBQW1DO0FBQUEsdUJBQVcsTUFBTSxPQUFOLEdBQWdCLGVBQWUsT0FBZixDQUEzQjtBQUFBLGFBQW5DLEVBQXVGLElBQXZGO0FBQ0Esa0JBQU0sTUFBTixDQUFhLFNBQWIsRUFBd0I7QUFBQSx1QkFBSyxRQUFRLE1BQVIsQ0FBZSxJQUFmLENBQUw7QUFBQSxhQUF4QixFQUFtRCxJQUFuRDs7QUFFQSxrQkFBTSxRQUFOLEdBQWlCLFNBQVMsUUFBVCxDQUFrQixDQUFsQixFQUFxQjtBQUNsQyx3QkFBUSxXQUFSLEdBQXNCLEVBQUUsR0FBeEI7O0FBRUEsb0JBQUksUUFBUSxRQUFaLEVBQ0ksUUFBUSxRQUFSLENBQWlCLENBQWpCO0FBQ1AsYUFMRDs7QUFPQSxxQkFBUyxnQkFBVCxHQUE0QjtBQUN4Qix3QkFBUSxNQUFSLENBQWUsS0FBZjtBQUNIOztBQUVELHFCQUFTLFdBQVQsQ0FBcUIsSUFBckIsRUFBMkIsV0FBM0IsRUFBd0M7QUFDcEMsdUJBQU8sa0JBQWtCLFdBQWxCLENBQVA7QUFDQSx3QkFBUSxNQUFSLENBQWUsSUFBZjtBQUNIOztBQUVELG9CQUNLLEdBREwsQ0FDUztBQUFBLHVCQUFLLGNBQWMsQ0FBbkI7QUFBQSxhQURULEVBRUssUUFGTCxDQUVjLENBRmQsRUFHSyxNQUhMLENBR1ksS0FIWixFQUlLLGFBSkwsQ0FJbUIsVUFBVSxNQUFWLEVBQWtCO0FBQzdCLDZCQUFhLEtBQWI7O0FBRUEsb0JBQUksTUFBSixFQUFZO0FBQ1IsMkJBQU8sQ0FBUDtBQUNBLDRCQUFRLElBQVIsR0FBZSxFQUFmO0FBQ0EsNEJBQVEsV0FBUixHQUFzQixJQUF0QjtBQUNIOztBQUVELG9CQUFJLFNBQVMsUUFBUSxNQUFSLENBQWUsRUFBRSxVQUFGLEVBQVEsVUFBUixFQUFjLFVBQVUsR0FBeEIsRUFBZixFQUE4QyxNQUFNLE9BQXBELENBQWI7QUFDQSxvQkFBSSxTQUFTLE9BQU8sUUFBUSxLQUFmLEtBQXlCLFFBQXpCLEdBQW9DLE1BQU0sRUFBRSxLQUFLLFFBQVEsS0FBZixFQUFzQixjQUF0QixFQUFOLENBQXBDLEdBQTRFLFFBQVEsS0FBUixDQUFjLE1BQWQsQ0FBekY7O0FBRUEsb0JBQUksQ0FBQyxPQUFPLFNBQVosRUFDSSxTQUFTLEdBQUcsVUFBSCxDQUFjLFdBQWQsQ0FBMEIsR0FBRyxJQUFILENBQVEsTUFBUixDQUExQixDQUFUOztBQUVKLHVCQUFPLE9BQU8sS0FBUCxDQUFhO0FBQUEsMkJBQUssR0FBRyxVQUFILENBQWMsS0FBZCxFQUFMO0FBQUEsaUJBQWIsQ0FBUDtBQUNILGFBcEJMLEVBcUJLLE1BckJMLENBcUJZLEtBckJaLEVBc0JLLEdBdEJMLENBc0JTLFVBQVUsSUFBVixFQUFnQjtBQUNqQixvQkFBSSxLQUFLLElBQVQsRUFBZSxPQUFPLEtBQUssSUFBWjtBQUNmO0FBQ0Esd0JBQVEsSUFBUixHQUFlLFFBQVEsSUFBUixDQUFhLE1BQWIsQ0FBb0IsSUFBcEIsQ0FBZjtBQUNBLHNCQUFNLE9BQU4sQ0FBYyxPQUFkLENBQXNCLGNBQXRCLENBQXFDLFVBQXJDLENBQWdELEtBQWhELEVBQXVELEtBQUssTUFBTCxJQUFlLEdBQXRFO0FBQ0gsYUEzQkwsRUE0QkssU0E1Qkw7QUE2Qkg7QUE5RUUsS0FBUDtBQWdGSCxDQWpGZ0IsQ0FBakI7O0FBbUZBLFNBQVMsY0FBVCxDQUF3QixPQUF4QixFQUFpQztBQUM3QixRQUFJLElBQUksRUFBUjs7QUFFQSxRQUFJLE9BQUosRUFDSSxLQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksUUFBUSxNQUE1QixFQUFvQyxHQUFwQyxFQUF5QztBQUNyQyxZQUFJLFNBQVMsUUFBUSxDQUFSLENBQWI7QUFDQSxZQUFJLFVBQVUsT0FBTyxPQUFQLElBQWtCLEVBQWhDOztBQUVBLFlBQUksUUFBUSxNQUFaLEVBQ0ksRUFBRSxPQUFPLElBQVQsSUFBaUIsT0FBakI7QUFDUDs7QUFFTCxXQUFPLENBQVA7QUFDSDs7QUFFRCxTQUFTLGlCQUFULENBQTJCLFdBQTNCLEVBQXdDO0FBQ3BDLFFBQUksSUFBSSxFQUFSOztBQUVBLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxZQUFZLE1BQWhDLEVBQXdDLEdBQXhDLEVBQTZDO0FBQ3pDLFlBQUksQ0FBSixFQUFPLEtBQUssR0FBTDs7QUFFUCxZQUFJLE1BQU0sWUFBWSxDQUFaLENBQVY7QUFDQSxZQUFJLElBQUksSUFBUixFQUNJLEtBQUssSUFBSSxJQUFKLEdBQVcsR0FBWCxHQUFpQixJQUFJLElBQUosQ0FBUyxTQUEvQjtBQUNQOztBQUVELFdBQU8sQ0FBUDtBQUNIOzs7OztBQzlHRCxPQUFPLE9BQVAsR0FBaUIsQ0FBQyxvQkFBRCxFQUF1QixRQUF2QixFQUFpQyxVQUFVLGtCQUFWLEVBQThCLEtBQTlCLEVBQXFDO0FBQ25GLFdBQU87QUFDSCxlQUFPLElBREo7QUFFSCxtTUFGRztBQUtILGNBQU0sY0FBVSxLQUFWLEVBQWlCLE9BQWpCLEVBQTBCLEtBQTFCLEVBQWlDO0FBQ25DLGdCQUFJLFVBQVUsTUFBTSxNQUFNLGFBQVosQ0FBZDs7QUFFQSxrQkFBTSxRQUFOLEdBQWlCLFlBQVk7QUFBQSwyQkFDSixRQUFRLEtBQVIsS0FBa0IsQ0FEZDs7QUFBQSxvQkFDbkIsVUFEbUIsUUFDbkIsVUFEbUI7O0FBRXpCLG9CQUFJLFVBQUosRUFDSSxLQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksV0FBVyxNQUEvQixFQUF1QyxHQUF2QztBQUNJLHdCQUFJLFdBQVcsQ0FBWCxFQUFjLE9BQWQsSUFBeUIsV0FBVyxDQUFYLEVBQWMsT0FBZCxDQUFzQixNQUFuRCxFQUNJLE9BQU8sSUFBUDtBQUZSO0FBR1AsYUFORDs7QUFRQSxrQkFBTSxVQUFOLEdBQW1CLFlBQVk7QUFDM0Isb0JBQUksY0FBYyxRQUFRLEtBQVIsS0FBa0IsRUFBcEM7QUFDQSxtQ0FBbUIsRUFBRSx3QkFBRixFQUFuQjtBQUNILGFBSEQ7QUFJSDtBQXBCRSxLQUFQO0FBc0JILENBdkJnQixDQUFqQjs7Ozs7QUNBQSxPQUFPLE9BQVAsR0FBaUIsQ0FBQyw4QkFBRCxFQUFpQyxVQUFVLE9BQVYsRUFBbUI7QUFDakUsV0FBTyxTQUFTLHFCQUFULENBQStCLEtBQS9CLEVBQXNDO0FBQ3pDLGVBQU8sUUFBUSxNQUFNLFNBQU4sQ0FBZ0IsQ0FBaEIsQ0FBUixLQUErQixLQUF0QztBQUNILEtBRkQ7QUFHSCxDQUpnQixDQUFqQjs7Ozs7QUNBQSxPQUFPLE9BQVAsR0FBaUIsQ0FBQyxZQUFZOztBQUUxQixRQUFJLFVBQVUsSUFBZDs7QUFFQSxRQUFJLElBQUksU0FBSixDQUFJLENBQVUsR0FBVixFQUFlO0FBQ25CLGVBQU8sRUFBRSxPQUFGLENBQVUsT0FBVixFQUFtQixHQUFuQixDQUFQO0FBQ0gsS0FGRDs7QUFJQSxNQUFFLElBQUYsR0FBUyxVQUFVLElBQVYsRUFBZ0I7QUFDckIsWUFBSSxDQUFDLElBQUwsRUFBVyxPQUFPLE9BQVA7QUFDWCxrQkFBVSxJQUFWO0FBQ0gsS0FIRDs7QUFLQSxNQUFFLE9BQUYsR0FBWTtBQUNSLFlBQUk7QUFDQSxtQkFBTyxPQURQO0FBRUEsb0JBQVEsUUFGUjtBQUdBLDJCQUFlLGlCQUhmO0FBSUEsdUJBQVcsWUFKWDtBQUtBLHFCQUFTLFNBTFQ7QUFNQSxrQkFBTSxNQU5OO0FBT0EsZ0JBQUk7QUFQSixTQURJO0FBVVIsWUFBSTtBQUNBLG1CQUFPLFdBRFA7QUFFQSxvQkFBUSxTQUZSO0FBR0EsMkJBQWUsd0JBSGY7QUFJQSx1QkFBVyxnQkFKWDtBQUtBLHFCQUFTLFNBTFQ7QUFNQSxrQkFBTSxJQU5OO0FBT0EsZ0JBQUk7QUFQSjtBQVZJLEtBQVo7O0FBcUJBLFdBQU8sQ0FBUDtBQUNILENBbkNnQixDQUFqQjs7Ozs7Ozs7O0FDQUEsT0FBTyxPQUFQLEdBQWlCLENBQUMsU0FBRCxFQUFZLFVBQVUsT0FBVixFQUFtQjtBQUFBLFFBQ3RDLGFBRHNDO0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQUE7QUFBQSxpREFFbkIsU0FGbUIsRUFFUjtBQUM1QixvQkFBSSxTQUFTLFFBQVEsV0FBUixDQUFvQixVQUFVLFdBQTlCLElBQTZDLFVBQVUsS0FBdkQsR0FBK0QsVUFBVSxXQUF0Rjs7QUFFQSxvQkFBSSxVQUFVLGdCQUFkLEVBQ0ksU0FBUyxRQUFRLFVBQVUsZ0JBQWxCLEVBQW9DLE1BQXBDLENBQVQ7O0FBRUosdUJBQU8sTUFBUDtBQUNIO0FBVHVDOztBQUFBO0FBQUE7O0FBWTVDLFdBQU8sSUFBSSxhQUFKLEVBQVA7QUFDSCxDQWJnQixDQUFqQjs7Ozs7QUNBQSxTQUFTLGVBQVQsQ0FBeUIsQ0FBekIsRUFBNEIsQ0FBNUIsRUFBK0I7QUFDM0IsV0FBTyxFQUFFLFdBQUYsR0FBZ0IsRUFBRSxXQUFsQixHQUFnQyxDQUFDLENBQWpDLEdBQXFDLEVBQUUsV0FBRixHQUFnQixFQUFFLFdBQWxCLEdBQWdDLENBQWhDLEdBQW9DLENBQWhGO0FBQ0g7O0FBRUQsU0FBUyxXQUFULENBQXFCLE9BQXJCLEVBQThCO0FBQzFCLFFBQUksU0FBUyxFQUFiOztBQUVBLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxRQUFRLE1BQTVCLEVBQW9DLEdBQXBDLEVBQXlDO0FBQ3JDLFlBQUksU0FBUyxRQUFRLENBQVIsQ0FBYjtBQUNBLFlBQUksVUFBVSxRQUFRLElBQVIsQ0FBYSxPQUFPLFNBQVAsQ0FBaUIsT0FBakIsSUFBNEIsRUFBekMsQ0FBZDs7QUFFQSxhQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksUUFBUSxNQUE1QixFQUFvQyxHQUFwQyxFQUF5QztBQUNyQyxnQkFBSSxTQUFTLFFBQVEsQ0FBUixDQUFiO0FBQ0EsbUJBQU8sTUFBUCxHQUFnQixNQUFoQjtBQUNBLG1CQUFPLElBQVAsQ0FBWSxNQUFaO0FBQ0g7QUFDSjs7QUFFRCxXQUFPLE1BQVA7QUFDSDs7QUFFRCxTQUFTLFdBQVQsQ0FBcUIsT0FBckIsRUFBOEIsT0FBOUIsRUFBdUM7QUFDbkMsU0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFFBQVEsTUFBNUIsRUFBb0MsR0FBcEM7QUFDSSxnQkFBUSxDQUFSLEVBQVcsU0FBWCxDQUFxQixPQUFyQixHQUErQixFQUEvQjtBQURKLEtBR0EsS0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFFBQVEsTUFBNUIsRUFBb0MsR0FBcEMsRUFBeUM7QUFDckMsWUFBSSxTQUFTLFFBQVEsQ0FBUixDQUFiO0FBQ0EsZUFBTyxNQUFQLENBQWMsU0FBZCxDQUF3QixPQUF4QixDQUFnQyxJQUFoQyxDQUFxQyxNQUFyQztBQUNBLGVBQU8sT0FBTyxNQUFkO0FBQ0g7QUFDSjs7QUFFRCxPQUFPLE9BQVAsR0FBaUIsQ0FBQyxXQUFELEVBQWMsVUFBZCxFQUEwQixVQUFVLFNBQVYsRUFBcUIsUUFBckIsRUFBK0I7QUFDdEUsV0FBTyxVQUFVLE9BQVYsRUFBbUI7QUFBQSxZQUNoQixXQURnQixHQUNBLE9BREEsQ0FDaEIsV0FEZ0I7OztBQUd0QixZQUFJLFNBQVM7QUFDVCw4QkFBa0IsSUFEVDtBQUVULGlDQUFxQixJQUZaO0FBR1Qsd0JBQVksQ0FBQyxRQUFELEVBQVcsV0FBWCxFQUF3QixlQUF4QixFQUF5QyxVQUFVLEtBQVYsRUFBaUIsU0FBakIsRUFBNEIsYUFBNUIsRUFBMkM7O0FBRTVGLHNCQUFNLE9BQU4sR0FBZ0IsWUFDWCxVQURXLENBRVgsR0FGVyxDQUVQO0FBQUEsMkJBQWM7QUFDZiw0Q0FEZTtBQUVmLHFDQUFhLGNBQWMsb0JBQWQsQ0FBbUMsU0FBbkM7QUFGRSxxQkFBZDtBQUFBLGlCQUZPLEVBTVgsSUFOVyxDQU1OLGVBTk0sQ0FBaEI7O0FBUUEsc0JBQU0sT0FBTixHQUFnQixZQUFZLE1BQU0sT0FBbEIsQ0FBaEI7O0FBRUEsc0JBQU0sS0FBTixHQUFjLFVBQVUsS0FBVixFQUFpQjtBQUMzQixnQ0FBWSxNQUFNLE9BQWxCLEVBQTJCLE1BQU0sT0FBakM7QUFDQSw4QkFBVSxJQUFWLENBQWUsS0FBZjtBQUNILGlCQUhEOztBQUtBLHNCQUFNLE1BQU4sR0FBZTtBQUFBLDJCQUFLLFVBQVUsTUFBVixFQUFMO0FBQUEsaUJBQWY7QUFDQSxzQkFBTSxnQkFBTixHQUF5QixFQUF6QjtBQUNBLHNCQUFNLGNBQU4sR0FBdUIsSUFBdkI7O0FBRUEsc0JBQU0sWUFBTixHQUFxQixVQUFVLE1BQVYsRUFBa0I7QUFDbkMsd0JBQUksUUFBUSxNQUFNLE9BQU4sQ0FBYyxPQUFkLENBQXNCLE1BQXRCLENBQVo7QUFDQSx3QkFBSSxVQUFVLENBQUMsQ0FBZixFQUNJLE1BQU0sT0FBTixDQUFjLE1BQWQsQ0FBcUIsS0FBckIsRUFBNEIsQ0FBNUI7QUFDUCxpQkFKRDs7QUFNQTtBQUNBLHNCQUFNLHFCQUFOLEdBQThCLFVBQVUsY0FBVixFQUEwQjtBQUNwRCx3QkFBSSxDQUFDLGNBQUwsRUFBcUI7O0FBRXJCO0FBQ0EsMEJBQU0sT0FBTixDQUFjLE9BQWQsQ0FBc0I7QUFDbEIsZ0NBQVE7QUFEVSxxQkFBdEI7O0FBSUEsNkJBQVMsWUFBWTtBQUNqQjtBQUNBLDhCQUFNLGdCQUFOLEdBQXlCLEVBQXpCO0FBQ0EsOEJBQU0sY0FBTixHQUF1QixJQUF2Qjs7QUFFQSw0QkFBSSxRQUFRLFNBQVMsYUFBVCxDQUF1QiwyQkFBdkIsQ0FBWjtBQUNBLDRCQUFJLEtBQUosRUFDSSxNQUFNLEtBQU47QUFDUCxxQkFSRDtBQVNILGlCQWpCRDtBQWtCSCxhQTlDVyxDQUhIO0FBa0RULDJCQUFlLElBbEROO0FBbURULHlCQUFhO0FBbkRKLFNBQWI7O0FBc0RBLGVBQU8sVUFBVSxJQUFWLENBQWUsTUFBZixDQUFQO0FBQ0gsS0ExREQ7QUEyREgsQ0E1RGdCLENBQWpCOzs7OztBQ2hDQSxRQUFRLDJCQUFSO0FBQ0EsUUFBUSw2QkFBUjtBQUNBLFFBQVEsNkJBQVI7QUFDQSxRQUFRLDZCQUFSOztBQUVBLElBQUksbUJBQW1CLFFBQVEseUJBQVIsQ0FBdkI7QUFDQSxJQUFJLFlBQVksUUFBUSxvQkFBUixDQUFoQjtBQUNBLElBQUksZUFBZSxRQUFRLHVCQUFSLENBQW5COztBQUVBLE9BQU8sT0FBUCxHQUFpQixDQUFDLGdCQUFELEVBQW1CLFVBQVMsY0FBVCxFQUF5QjtBQUN6RDtBQUNBLG1CQUFlLEdBQWYsQ0FBbUIsMEJBQW5CLEVBQStDLGVBQWUsR0FBZixDQUFtQixnQkFBbkIsQ0FBL0M7QUFDQSxtQkFBZSxHQUFmLENBQW1CLHFCQUFuQixFQUEwQyxlQUFlLEdBQWYsQ0FBbUIsU0FBbkIsQ0FBMUM7QUFDQSxtQkFBZSxHQUFmLENBQW1CLHdCQUFuQixFQUE2QyxlQUFlLEdBQWYsQ0FBbUIsWUFBbkIsQ0FBN0M7QUFDSCxDQUxnQixDQUFqQjs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNmQSxHQUFHLFVBQUgsQ0FBYyxTQUFkLENBQXdCLE1BQXhCLEdBQWlDLFVBQVUsS0FBVixFQUFpQixPQUFqQixFQUEwQjtBQUN2RCxRQUFJLE9BQU8sSUFBWDtBQUNBLFdBQU8sSUFBSSxHQUFHLG1CQUFQLENBQTJCLFVBQVUsUUFBVixFQUFvQjtBQUNsRCxlQUFPLEtBQUssU0FBTCxDQUNILFVBQVUsQ0FBVixFQUFhO0FBQ1Qsa0JBQU0sTUFBTixDQUFhLFlBQVk7QUFBRSx5QkFBUyxNQUFULENBQWdCLENBQWhCO0FBQXFCLGFBQWhEO0FBQ0gsU0FIRSxFQUlILFNBQVMsT0FBVCxDQUFpQixJQUFqQixDQUFzQixRQUF0QixDQUpHLEVBS0gsU0FBUyxXQUFULENBQXFCLElBQXJCLENBQTBCLFFBQTFCLENBTEcsQ0FBUDtBQU9ILEtBUk0sQ0FBUDtBQVNILENBWEQ7Ozs7O0FDQUEsUUFDSyxNQURMLENBQ1ksZUFEWixFQUM2QixDQUFDLFlBQUQsRUFBZSxXQUFmLEVBQTRCLFNBQTVCLEVBQXVDLHVCQUF2QyxFQUFnRSxxQkFBaEUsRUFBdUYsd0JBQXZGLENBRDdCOztBQUdJO0FBSEosQ0FJSyxTQUpMLENBSWUsZ0JBSmYsRUFJaUMsUUFBUSw4QkFBUixDQUpqQyxFQUtLLFNBTEwsQ0FLZSxRQUxmLEVBS3lCLFFBQVEsc0JBQVIsQ0FMekIsRUFNSyxTQU5MLENBTWUsb0JBTmYsRUFNcUMsUUFBUSxtQ0FBUixDQU5yQzs7QUFRSTtBQVJKLENBU0ssTUFUTCxDQVNZLHVCQVRaLEVBU3FDLFFBQVEsaUNBQVIsQ0FUckM7O0FBV0k7QUFYSixDQVlLLE9BWkwsQ0FZYSxvQkFaYixFQVltQyxRQUFRLCtCQUFSLENBWm5DLEVBYUssT0FiTCxDQWFhLGVBYmIsRUFhOEIsUUFBUSwwQkFBUixDQWI5QixFQWNLLE9BZEwsQ0FjYSw4QkFkYixFQWM2QyxRQUFRLHlDQUFSLENBZDdDOztBQWdCSTtBQWhCSixDQWlCSyxHQWpCTCxDQWlCUyxRQUFRLGFBQVIsQ0FqQlQ7O0FBbUJBLFFBQVEsWUFBUiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBzZWFyY2hhYmxlU3RyaW5nKGEpIHtcclxuICAgIHJldHVybiAoYSB8fCAnJykudG9Mb3dlckNhc2UoKTsgICAgICAgIFxyXG59XHJcblxyXG4vLy8gZXhhbXBsZVxyXG4vLy9cclxuLy8vICAgICA8eHAtYXV0b2NvbXBsZXRlIHhwLWl0ZW1zPVwiaXRlbSBpbiBpdGVtc1wiIHhwLWl0ZW0tdGV4dD1cIml0ZW0uZGlzcGxheVwiPjwveHAtYXV0b2NvbXBsZXRlPlxyXG4vLy9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gWyckcGFyc2UnLCBmdW5jdGlvbiAoJHBhcnNlKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgeHBJdGVtczogJz0/JyxcclxuICAgICAgICAgICAgeHBTZWFyY2hUZXh0OiAnPT8nLFxyXG4gICAgICAgICAgICB4cFNlbGVjdGVkSXRlbTogJz0/JyxcclxuICAgICAgICAgICAgeHBGbG9hdGluZ0xhYmVsOiAnQCdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRlbXBsYXRlOiBmdW5jdGlvbiAoZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGA8bWQtYXV0b2NvbXBsZXRlXHJcbiAgICAgICAgICAgICAgICBtZC1pdGVtcz1cIml0ZW0gaW4gX2l0ZW1zXCJcclxuICAgICAgICAgICAgICAgIG1kLWl0ZW0tdGV4dD1cIiR7YXR0cnMueHBJdGVtVGV4dH1cIlxyXG4gICAgICAgICAgICAgICAgbWQtc2VhcmNoLXRleHQ9XCJ4cFNlYXJjaFRleHRcIlxyXG4gICAgICAgICAgICAgICAgbWQtc2VhcmNoLXRleHQtY2hhbmdlPVwiJHthdHRycy54cFNlYXJjaFRleHRDaGFuZ2V9XCJcclxuICAgICAgICAgICAgICAgIG1kLXNlbGVjdGVkLWl0ZW09XCJ4cFNlbGVjdGVkSXRlbVwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWxlY3RlZC1pdGVtLWNoYW5nZT1cInNlbGVjdGVkSXRlbUNoYW5nZSh4cFNlbGVjdGVkSXRlbSlcIlxyXG4gICAgICAgICAgICAgICAgbWQtbWluLWxlbmd0aD1cIjBcIlxyXG4gICAgICAgICAgICAgICAgbWQtYXV0b3NlbGVjdD1cInRydWVcIlxyXG4gICAgICAgICAgICAgICAgbWQtbWF0Y2gtY2FzZS1pbnNlbnNpdGl2ZT1cInRydWVcIlxyXG4gICAgICAgICAgICAgICAgbWQtZmxvYXRpbmctbGFiZWw9XCJ7e3hwRmxvYXRpbmdMYWJlbH19XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPG1kLWl0ZW0tdGVtcGxhdGU+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIG1kLWhpZ2hsaWdodC10ZXh0PVwieHBTZWFyY2hUZXh0XCIgbWQtaGlnaGxpZ2h0LWZsYWdzPVwiaVwiPnt7JHthdHRycy54cEl0ZW1UZXh0fX19PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvbWQtaXRlbS10ZW1wbGF0ZT5cclxuICAgICAgICAgICAgPC9tZC1hdXRvY29tcGxldGU+YDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgdmFyIGdldEl0ZW1UZXh0ID0gJHBhcnNlKGF0dHJzLnhwSXRlbVRleHQpO1xyXG4gICAgICAgICAgICB2YXIgaXRlbXM7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5faXRlbXMgPSBbXTtcclxuICAgICAgICAgICAgc2NvcGUuX3NlYXJjaF90ZXh0ID0gJyc7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5zZWxlY3RlZEl0ZW1DaGFuZ2UgPSBpdGVtID0+IHNjb3BlLiRwYXJlbnQuJGV2YWwoYXR0cnMueHBTZWxlY3RlZEl0ZW1DaGFuZ2UsIHsgaXRlbSB9KTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLiR3YXRjaChgW3hwSXRlbXMseHBTZWFyY2hUZXh0XWAsIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaXRlbXMgPSBlWzBdIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgdmFyIHRleHQgPSBlWzFdIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgdmFyIGFycmF5ID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgdGV4dCA9IHNlYXJjaGFibGVTdHJpbmcodGV4dCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKylcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRleHQgfHwgc2VhcmNoYWJsZVN0cmluZyhnZXRJdGVtVGV4dChzY29wZSwgeyBpdGVtOiBpdGVtc1tpXSB9KSkuaW5kZXhPZih0ZXh0KSAhPT0gLTEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5LnB1c2goaXRlbXNbaV0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLl9pdGVtcyA9IGFycmF5O1xyXG5cclxuICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufV07IiwibW9kdWxlLmV4cG9ydHMgPSBbJyRxJywgJyRodHRwJywgZnVuY3Rpb24gKCRxLCAkaHR0cCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHNjb3BlOiB0cnVlLFxyXG4gICAgICAgIHRlbXBsYXRlOiBgPGRpdiBsYXlvdXQ9XCJjb2x1bW5cIiBjbGFzcz1cInhwLWdyaWRcIj5cclxuICAgICAgICAgICAgPHhwLWdyaWRmaWx0ZXItYnV0dG9uIHhwLWdyaWQtb3B0aW9ucz1cIm9wdGlvbnNcIiBsYXlvdXQ9XCJyb3dcIiBsYXlvdXQtYWxpZ249XCJlbmQgY2VudGVyXCI+PC94cC1ncmlkZmlsdGVyLWJ1dHRvbj5cclxuICAgICAgICAgICAgPGRpdiB1aS1ncmlkPVwib3B0aW9uc1wiIGZsZXggdWktZ3JpZC1yZXNpemUtY29sdW1ucyB1aS1ncmlkLW1vdmUtY29sdW1ucyB1aS1ncmlkLWluZmluaXRlLXNjcm9sbD48L2Rpdj5cclxuICAgICAgICA8L2Rpdj5gLFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBzb3J0O1xyXG4gICAgICAgICAgICB2YXIgbXVzdFJlbG9hZDtcclxuICAgICAgICAgICAgdmFyIHBhZ2UgPSAwO1xyXG4gICAgICAgICAgICB2YXIgcmVmcmVzaCA9IG5ldyBSeC5TdWJqZWN0KCk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5vcHRpb25zID0gc2NvcGUuJHBhcmVudC4kZXZhbChhdHRycy54cEdyaWRPcHRpb25zIHx8ICd7fScpIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBhbmd1bGFyLmV4dGVuZChzY29wZS5vcHRpb25zLCB7XHJcbiAgICAgICAgICAgICAgICBkYXRhOiBbXSxcclxuICAgICAgICAgICAgICAgIGluZmluaXRlU2Nyb2xsUm93c0Zyb21FbmQ6IDEwMCxcclxuICAgICAgICAgICAgICAgIGluZmluaXRlU2Nyb2xsRG93bjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG9uUmVnaXN0ZXJBcGk6IGZ1bmN0aW9uIChncmlkQXBpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUub3B0aW9ucy5ncmlkQXBpID0gZ3JpZEFwaTtcclxuICAgICAgICAgICAgICAgICAgICBncmlkQXBpLmNvcmUub24uc29ydENoYW5nZWQoc2NvcGUsIHNvcnRDaGFuZ2VkKTtcclxuICAgICAgICAgICAgICAgICAgICBzb3J0Q2hhbmdlZChncmlkQXBpLmdyaWQsIFtvcHRpb25zLmNvbHVtbkRlZnNbMV1dKTtcclxuICAgICAgICAgICAgICAgICAgICBncmlkQXBpLmluZmluaXRlU2Nyb2xsLm9uLm5lZWRMb2FkTW9yZURhdGEoc2NvcGUsIG5lZWRMb2FkTW9yZURhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIG9wdGlvbnMucmVmcmVzaCA9IF8gPT4gcmVmcmVzaC5vbk5leHQodHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goJ29wdGlvbnMuY29sdW1uRGVmcycsIGNvbHVtbnMgPT4gc2NvcGUuZmlsdGVycyA9IGNvbXB1dGVGaWx0ZXJzKGNvbHVtbnMpLCB0cnVlKTtcclxuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKCdmaWx0ZXJzJywgXyA9PiByZWZyZXNoLm9uTmV4dCh0cnVlKSwgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5yb3dDbGljayA9IGZ1bmN0aW9uIHJvd0NsaWNrKGUpIHtcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMuc2VsZWN0ZWRSb3cgPSBlLnJvdztcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5yb3dDbGljaylcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnJvd0NsaWNrKGUpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gbmVlZExvYWRNb3JlRGF0YSgpIHtcclxuICAgICAgICAgICAgICAgIHJlZnJlc2gub25OZXh0KGZhbHNlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gc29ydENoYW5nZWQoZ3JpZCwgc29ydENvbHVtbnMpIHtcclxuICAgICAgICAgICAgICAgIHNvcnQgPSBjb21wdXRlU29ydFN0cmluZyhzb3J0Q29sdW1ucyk7XHJcbiAgICAgICAgICAgICAgICByZWZyZXNoLm9uTmV4dCh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVmcmVzaFxyXG4gICAgICAgICAgICAgICAgLm1hcChlID0+IG11c3RSZWxvYWQgfD0gZSlcclxuICAgICAgICAgICAgICAgIC5kZWJvdW5jZSgxKVxyXG4gICAgICAgICAgICAgICAgLiRhcHBseShzY29wZSlcclxuICAgICAgICAgICAgICAgIC5mbGF0TWFwTGF0ZXN0KGZ1bmN0aW9uIChyZWxvYWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBtdXN0UmVsb2FkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFnZSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLnNlbGVjdGVkUm93ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSBhbmd1bGFyLmV4dGVuZCh7IHBhZ2UsIHNvcnQsIHBhZ2VTaXplOiAxMDAgfSwgc2NvcGUuZmlsdGVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHR5cGVvZiBvcHRpb25zLmZldGNoID09PSAnc3RyaW5nJyA/ICRodHRwKHsgdXJsOiBvcHRpb25zLmZldGNoLCBwYXJhbXMgfSkgOiBvcHRpb25zLmZldGNoKHBhcmFtcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LnN1YnNjcmliZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gUnguT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZSgkcS53aGVuKHJlc3VsdCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LmNhdGNoKF8gPT4gUnguT2JzZXJ2YWJsZS5lbXB0eSgpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuJGFwcGx5KHNjb3BlKVxyXG4gICAgICAgICAgICAgICAgLnRhcChmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmRhdGEpIGRhdGEgPSBkYXRhLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YSA9IG9wdGlvbnMuZGF0YS5jb25jYXQoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUub3B0aW9ucy5ncmlkQXBpLmluZmluaXRlU2Nyb2xsLmRhdGFMb2FkZWQoZmFsc2UsIGRhdGEubGVuZ3RoID49IDEwMCk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnN1YnNjcmliZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufV07XHJcblxyXG5mdW5jdGlvbiBjb21wdXRlRmlsdGVycyhjb2x1bW5zKSB7XHJcbiAgICB2YXIgbyA9IHt9O1xyXG5cclxuICAgIGlmIChjb2x1bW5zKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgY29sdW1uID0gY29sdW1uc1tpXTtcclxuICAgICAgICAgICAgdmFyIGZpbHRlcnMgPSBjb2x1bW4uZmlsdGVycyB8fCBbXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChmaWx0ZXJzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgIG9bY29sdW1uLm5hbWVdID0gZmlsdGVycztcclxuICAgICAgICB9XHJcblxyXG4gICAgcmV0dXJuIG87XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbXB1dGVTb3J0U3RyaW5nKHNvcnRDb2x1bW5zKSB7XHJcbiAgICB2YXIgcyA9ICcnO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc29ydENvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAocykgcyArPSAnLCc7XHJcblxyXG4gICAgICAgIHZhciBjb2wgPSBzb3J0Q29sdW1uc1tpXTtcclxuICAgICAgICBpZiAoY29sLnNvcnQpXHJcbiAgICAgICAgICAgIHMgKz0gY29sLm5hbWUgKyAnOicgKyBjb2wuc29ydC5kaXJlY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHM7XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IFsneHBHcmlkZmlsdGVyRGlhbG9nJywgJyRwYXJzZScsIGZ1bmN0aW9uICh4cEdyaWRmaWx0ZXJEaWFsb2csIHBhcnNlKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHNjb3BlOiB0cnVlLFxyXG4gICAgICAgIHRlbXBsYXRlOiBgPG1kLWJ1dHRvbiBhcmlhLWxhYmVsPVwiRmlsdGVyXCIgbmctY2xpY2s9XCJzaG93RGlhbG9nKClcIiBuZy1jbGFzcz1cInsnbWQtcHJpbWFyeSc6IGZpbHRlcmVkKCl9XCI+XHJcbiAgICAgICAgICAgIDxuZy1tZC1pY29uIGljb249XCJmaWx0ZXJfbGlzdFwiPjwvbmctbWQtaWNvbj5cclxuICAgICAgICA8L21kLWJ1dHRvbj5gLFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBwYXJzZShhdHRycy54cEdyaWRPcHRpb25zKTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLmZpbHRlcmVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHsgY29sdW1uRGVmcyB9ID0gb3B0aW9ucyhzY29wZSkgfHwgMDtcclxuICAgICAgICAgICAgICAgIGlmIChjb2x1bW5EZWZzKVxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1uRGVmcy5sZW5ndGg7IGkrKylcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbHVtbkRlZnNbaV0uZmlsdGVycyAmJiBjb2x1bW5EZWZzW2ldLmZpbHRlcnMubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS5zaG93RGlhbG9nID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGdyaWRPcHRpb25zID0gb3B0aW9ucyhzY29wZSkgfHwge307XHJcbiAgICAgICAgICAgICAgICB4cEdyaWRmaWx0ZXJEaWFsb2coeyBncmlkT3B0aW9ucyB9KTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XTsiLCJtb2R1bGUuZXhwb3J0cyA9IFsneHBDb21wb25lbnRzVHJhbnNsYXRlU2VydmljZScsIGZ1bmN0aW9uIChzZXJ2aWNlKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24geHBDb21wb25lbnRzVHJhbnNsYXRlKHZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIHNlcnZpY2UodmFsdWUuc3Vic3RyaW5nKDIpKSB8fCB2YWx1ZTtcclxuICAgIH07XHJcbn1dOyIsIm1vZHVsZS5leHBvcnRzID0gW2Z1bmN0aW9uICgpIHtcclxuXHJcbiAgICB2YXIgY3VycmVudCA9ICdlbic7XHJcblxyXG4gICAgdmFyIGYgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgcmV0dXJuIGYubG9jYWxlc1tjdXJyZW50XVtrZXldO1xyXG4gICAgfVxyXG5cclxuICAgIGYubGFuZyA9IGZ1bmN0aW9uIChsYW5nKSB7XHJcbiAgICAgICAgaWYgKCFsYW5nKSByZXR1cm4gY3VycmVudDtcclxuICAgICAgICBjdXJyZW50ID0gbGFuZztcclxuICAgIH07XHJcblxyXG4gICAgZi5sb2NhbGVzID0ge1xyXG4gICAgICAgIGVuOiB7XHJcbiAgICAgICAgICAgIEFwcGx5OiAnQXBwbHknLFxyXG4gICAgICAgICAgICBDYW5jZWw6ICdDYW5jZWwnLFxyXG4gICAgICAgICAgICBDaG9vc2VBQ29sdW1uOiAnQ2hvb3NlIGEgY29sdW1uJyxcclxuICAgICAgICAgICAgRGVsZXRlQWxsOiAnRGVsZXRlIEFsbCcsXHJcbiAgICAgICAgICAgIEZpbHRlcnM6ICdGaWx0ZXJzJyxcclxuICAgICAgICAgICAgRnJvbTogJ0Zyb20nLFxyXG4gICAgICAgICAgICBUbzogJ1RvJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnI6IHtcclxuICAgICAgICAgICAgQXBwbHk6ICdBcHBsaXF1ZXInLFxyXG4gICAgICAgICAgICBDYW5jZWw6ICdBbm51bGVyJyxcclxuICAgICAgICAgICAgQ2hvb3NlQUNvbHVtbjogJ0Nob2lzaXNzZXogdW5lIGNvbG9ubmUnLFxyXG4gICAgICAgICAgICBEZWxldGVBbGw6ICdTdXBwcmltZXIgdG91dCcsXHJcbiAgICAgICAgICAgIEZpbHRlcnM6ICdGaWx0cmVzJyxcclxuICAgICAgICAgICAgRnJvbTogJ0RlJyxcclxuICAgICAgICAgICAgVG86ICfDgCdcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBmO1xyXG59XTsiLCJtb2R1bGUuZXhwb3J0cyA9IFsnJGZpbHRlcicsIGZ1bmN0aW9uICgkZmlsdGVyKSB7XHJcbiAgICBjbGFzcyBYcEdyaWRTZXJ2aWNlIHtcclxuICAgICAgICBnZXRDb2x1bW5EaXNwbGF5TmFtZShjb2x1bW5EZWYpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGFuZ3VsYXIuaXNVbmRlZmluZWQoY29sdW1uRGVmLmRpc3BsYXlOYW1lKSA/IGNvbHVtbkRlZi5maWVsZCA6IGNvbHVtbkRlZi5kaXNwbGF5TmFtZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb2x1bW5EZWYuaGVhZGVyQ2VsbEZpbHRlcilcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9ICRmaWx0ZXIoY29sdW1uRGVmLmhlYWRlckNlbGxGaWx0ZXIpKHJlc3VsdCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3IFhwR3JpZFNlcnZpY2UoKTtcclxufV07IiwiZnVuY3Rpb24gY29sdW1uc0NvbXBhcmVyKGEsIGIpIHtcclxuICAgIHJldHVybiBhLmRpc3BsYXlOYW1lIDwgYi5kaXNwbGF5TmFtZSA/IC0xIDogYS5kaXNwbGF5TmFtZSA+IGIuZGlzcGxheU5hbWUgPyAxIDogMDtcclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZEZpbHRlcnMoY29sdW1ucykge1xyXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBjb2x1bW4gPSBjb2x1bW5zW2ldO1xyXG4gICAgICAgIHZhciBmaWx0ZXJzID0gYW5ndWxhci5jb3B5KGNvbHVtbi5jb2x1bW5EZWYuZmlsdGVycyB8fCBbXSk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZmlsdGVycy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICB2YXIgZmlsdGVyID0gZmlsdGVyc1tqXTtcclxuICAgICAgICAgICAgZmlsdGVyLmNvbHVtbiA9IGNvbHVtbjtcclxuICAgICAgICAgICAgcmVzdWx0LnB1c2goZmlsdGVyKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2F2ZUZpbHRlcnMoY29sdW1ucywgZmlsdGVycykge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2x1bW5zLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGNvbHVtbnNbaV0uY29sdW1uRGVmLmZpbHRlcnMgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbHRlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgZmlsdGVyID0gZmlsdGVyc1tpXTtcclxuICAgICAgICBmaWx0ZXIuY29sdW1uLmNvbHVtbkRlZi5maWx0ZXJzLnB1c2goZmlsdGVyKTtcclxuICAgICAgICBkZWxldGUgZmlsdGVyLmNvbHVtbjtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBbJyRtZERpYWxvZycsICckdGltZW91dCcsIGZ1bmN0aW9uICgkbWREaWFsb2csICR0aW1lb3V0KSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuICAgICAgICB2YXIgeyBncmlkT3B0aW9ucyB9ID0gb3B0aW9ucztcclxuXHJcbiAgICAgICAgdmFyIGRpYWxvZyA9IHtcclxuICAgICAgICAgICAgYmluZFRvQ29udHJvbGxlcjogdHJ1ZSxcclxuICAgICAgICAgICAgY2xpY2tPdXRzaWRlVG9DbG9zZTogdHJ1ZSxcclxuICAgICAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJG1kRGlhbG9nJywgJ3hwR3JpZFNlcnZpY2UnLCBmdW5jdGlvbiAoc2NvcGUsICRtZERpYWxvZywgeHBHcmlkU2VydmljZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSBncmlkT3B0aW9uc1xyXG4gICAgICAgICAgICAgICAgICAgIC5jb2x1bW5EZWZzXHJcbiAgICAgICAgICAgICAgICAgICAgLm1hcChjb2x1bW5EZWYgPT4gKHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbkRlZixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheU5hbWU6IHhwR3JpZFNlcnZpY2UuZ2V0Q29sdW1uRGlzcGxheU5hbWUoY29sdW1uRGVmKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zb3J0KGNvbHVtbnNDb21wYXJlcik7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuZmlsdGVycyA9IGxvYWRGaWx0ZXJzKHNjb3BlLmNvbHVtbnMpO1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmFwcGx5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2F2ZUZpbHRlcnMoc2NvcGUuY29sdW1ucywgc2NvcGUuZmlsdGVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgJG1kRGlhbG9nLmhpZGUodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5jYW5jZWwgPSBfID0+ICRtZERpYWxvZy5jYW5jZWwoKTtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmF1dG9Db21wbGV0ZVRleHQgPSAnJztcclxuICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkQ29sdW1uID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5yZW1vdmVGaWx0ZXIgPSBmdW5jdGlvbiAoZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gc2NvcGUuZmlsdGVycy5pbmRleE9mKGZpbHRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsdGVycy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB3aGVuIGEgY29sdW1uIGlzIHNlbGVjdGVkIGluIHRoZSBhdXRvY29tcGxldGVcclxuICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkQ29sdW1uQ2hhbmdlZCA9IGZ1bmN0aW9uIChzZWxlY3RlZENvbHVtbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc2VsZWN0ZWRDb2x1bW4pIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGNvbHVtbnMgdG8gdGhlIGxpc3Qgb2YgZmlsdGVycyBmb3IgZWRpdGluZy5cclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5maWx0ZXJzLnVuc2hpZnQoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHNlbGVjdGVkQ29sdW1uXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2xlYXIgdGhlIGF1dG9jb21wbGV0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5hdXRvQ29tcGxldGVUZXh0ID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkQ29sdW1uID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy54cC1ncmlkZmlsdGVyLWl0ZW0gaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1dLFxyXG4gICAgICAgICAgICBlc2NhcGVUb0Nsb3NlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kaWFsb2cuaHRtbCdcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gJG1kRGlhbG9nLnNob3coZGlhbG9nKTtcclxuICAgIH07XHJcbn1dOyIsInJlcXVpcmUoJy4veHAtZ3JpZGZpbHRlci1kYXRlLmh0bWwnKTtcclxucmVxdWlyZSgnLi94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sJyk7XHJcbnJlcXVpcmUoJy4veHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbCcpO1xyXG5yZXF1aXJlKCcuL3hwLWdyaWRmaWx0ZXItc3RyaW5nLmh0bWwnKTtcclxuXHJcbnZhciB1aUdyaWRIZWFkZXJDZWxsID0gcmVxdWlyZSgnLi91aUdyaWRIZWFkZXJDZWxsLmh0bWwnKTtcclxudmFyIHVpR3JpZFJvdyA9IHJlcXVpcmUoJy4vdWktZ3JpZC1yb3cuaHRtbCcpO1xyXG52YXIgdWlHcmlkSGVhZGVyID0gcmVxdWlyZSgnLi91aS1ncmlkLWhlYWRlci5odG1sJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgLy9SZXBsYWNlIHVpLWdyaWQgdGVtcGxhdGVzIFxyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd1aS1ncmlkL3VpR3JpZEhlYWRlckNlbGwnLCAkdGVtcGxhdGVDYWNoZS5nZXQodWlHcmlkSGVhZGVyQ2VsbCkpO1xyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd1aS1ncmlkL3VpLWdyaWQtcm93JywgJHRlbXBsYXRlQ2FjaGUuZ2V0KHVpR3JpZFJvdykpO1xyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd1aS1ncmlkL3VpLWdyaWQtaGVhZGVyJywgJHRlbXBsYXRlQ2FjaGUuZ2V0KHVpR3JpZEhlYWRlcikpO1xyXG59XTsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy91aS1ncmlkLWhlYWRlci5odG1sJyxcbiAgICAnPGRpdlxcbicgK1xuICAgICcgIHJvbGU9XCJyb3dncm91cFwiXFxuJyArXG4gICAgJyAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlclwiPiA8IS0tIHRoZWFkZXIgLS0+XFxuJyArXG4gICAgJyAgPGRpdlxcbicgK1xuICAgICcgICAgY2xhc3M9XCJ1aS1ncmlkLXRvcC1wYW5lbFwiPlxcbicgK1xuICAgICcgICAgPGRpdlxcbicgK1xuICAgICcgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLXZpZXdwb3J0XCI+XFxuJyArXG4gICAgJyAgICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNhbnZhc1wiPlxcbicgK1xuICAgICcgICAgICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2VsbC13cmFwcGVyXCJcXG4nICtcbiAgICAnICAgICAgICAgIG5nLXN0eWxlPVwiY29sQ29udGFpbmVyLmhlYWRlckNlbGxXcmFwcGVyU3R5bGUoKVwiPlxcbicgK1xuICAgICcgICAgICAgICAgPGRpdlxcbicgK1xuICAgICcgICAgICAgICAgICByb2xlPVwicm93XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jZWxsLXJvd1wiPlxcbicgK1xuICAgICcgICAgICAgICAgICA8ZGl2XFxuJyArXG4gICAgJyAgICAgICAgICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jZWxsIHVpLWdyaWQtY2xlYXJmaXhcIlxcbicgK1xuICAgICcgICAgICAgICAgICAgIG5nLXJlcGVhdD1cImNvbCBpbiBjb2xDb250YWluZXIucmVuZGVyZWRDb2x1bW5zIHRyYWNrIGJ5IGNvbC51aWRcIlxcbicgK1xuICAgICcgICAgICAgICAgICAgIHVpLWdyaWQtaGVhZGVyLWNlbGxcXG4nICtcbiAgICAnICAgICAgICAgICAgICBtZC1jb2xvcnM9XCI6OntiYWNrZ3JvdW5kOiBcXCdiYWNrZ3JvdW5kXFwnfVwiXFxuJyArXG4gICAgJyAgICAgICAgICAgICAgY29sPVwiY29sXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgICByZW5kZXItaW5kZXg9XCIkaW5kZXhcIj5cXG4nICtcbiAgICAnICAgICAgICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICAgICAgICA8L2Rpdj5cXG4nICtcbiAgICAnICAgICAgICA8L2Rpdj5cXG4nICtcbiAgICAnICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICA8L2Rpdj5cXG4nICtcbiAgICAnICA8L2Rpdj5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3VpLWdyaWQtaGVhZGVyLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy91aS1ncmlkLXJvdy5odG1sJyxcbiAgICAnPGRpdiBuZy1yZXBlYXQ9XCIoY29sUmVuZGVySW5kZXgsIGNvbCkgaW4gY29sQ29udGFpbmVyLnJlbmRlcmVkQ29sdW1ucyB0cmFjayBieSBjb2wudWlkXCIgdWktZ3JpZC1vbmUtYmluZC1pZC1ncmlkPVwicm93UmVuZGVySW5kZXggKyBcXCctXFwnICsgY29sLnVpZCArIFxcJy1jZWxsXFwnXCJcXG4nICtcbiAgICAnICAgIGNsYXNzPVwidWktZ3JpZC1jZWxsXCIgbmctY2xhc3M9XCJ7IFxcJ3VpLWdyaWQtcm93LWhlYWRlci1jZWxsXFwnOiBjb2wuaXNSb3dIZWFkZXIgfVwiIG1kLWNvbG9ycz1cIjo6e2JhY2tncm91bmQ6IFxcJ2JhY2tncm91bmQtaHVlLVxcJyArIChyb3dSZW5kZXJJbmRleCAlIDIgKyAxKX1cIiByb2xlPVwie3tjb2wuaXNSb3dIZWFkZXIgPyBcXCdyb3doZWFkZXJcXCcgOiBcXCdncmlkY2VsbFxcJ319XCJcXG4nICtcbiAgICAnICAgIHVpLWdyaWQtY2VsbCBuZy1jbGljaz1cIiRwYXJlbnQuJHBhcmVudC4kcGFyZW50LiRwYXJlbnQuJHBhcmVudC4kcGFyZW50LiRwYXJlbnQucm93Q2xpY2soeyBldmVudDogJGV2ZW50LCByb3c6IHJvdywgY29sOiBjb2wgfSlcIj5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3VpLWdyaWQtcm93Lmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy91aUdyaWRIZWFkZXJDZWxsLmh0bWwnLFxuICAgICc8ZGl2XFxuJyArXG4gICAgJyAgcm9sZT1cImNvbHVtbmhlYWRlclwiXFxuJyArXG4gICAgJyAgbmctY2xhc3M9XCJ7IFxcJ3NvcnRhYmxlXFwnOiBzb3J0YWJsZSB9XCJcXG4nICtcbiAgICAnICB1aS1ncmlkLW9uZS1iaW5kLWFyaWEtbGFiZWxsZWRieS1ncmlkPVwiY29sLnVpZCArIFxcJy1oZWFkZXItdGV4dCBcXCcgKyBjb2wudWlkICsgXFwnLXNvcnRkaXItdGV4dFxcJ1wiXFxuJyArXG4gICAgJyAgYXJpYS1zb3J0PVwie3tjb2wuc29ydC5kaXJlY3Rpb24gPT0gYXNjID8gXFwnYXNjZW5kaW5nXFwnIDogKCBjb2wuc29ydC5kaXJlY3Rpb24gPT0gZGVzYyA/IFxcJ2Rlc2NlbmRpbmdcXCcgOiAoIWNvbC5zb3J0LmRpcmVjdGlvbiA/IFxcJ25vbmVcXCcgOiBcXCdvdGhlclxcJykpfX1cIj5cXG4nICtcbiAgICAnICA8bWQtYnV0dG9uXFxuJyArXG4gICAgJyAgICByb2xlPVwiYnV0dG9uXCJcXG4nICtcbiAgICAnICAgIHRhYmluZGV4PVwiMFwiXFxuJyArXG4gICAgJyAgICBjbGFzcz1cInVpLWdyaWQtY2VsbC1jb250ZW50cyB1aS1ncmlkLWhlYWRlci1jZWxsLXByaW1hcnktZm9jdXNcIlxcbicgK1xuICAgICcgICAgY29sLWluZGV4PVwicmVuZGVySW5kZXhcIlxcbicgK1xuICAgICcgICAgdGl0bGU9XCJUT09MVElQXCI+XFxuJyArXG4gICAgJyAgICA8c3BhblxcbicgK1xuICAgICcgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNlbGwtbGFiZWxcIlxcbicgK1xuICAgICcgICAgICB1aS1ncmlkLW9uZS1iaW5kLWlkLWdyaWQ9XCJjb2wudWlkICsgXFwnLWhlYWRlci10ZXh0XFwnXCI+XFxuJyArXG4gICAgJyAgICAgIHt7IGNvbC5kaXNwbGF5TmFtZSBDVVNUT01fRklMVEVSUyB9fVxcbicgK1xuICAgICcgICAgPC9zcGFuPlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICAgIDxzcGFuXFxuJyArXG4gICAgJyAgICAgIHVpLWdyaWQtb25lLWJpbmQtaWQtZ3JpZD1cImNvbC51aWQgKyBcXCctc29ydGRpci10ZXh0XFwnXCJcXG4nICtcbiAgICAnICAgICAgdWktZ3JpZC12aXNpYmxlPVwiY29sLnNvcnQuZGlyZWN0aW9uXCJcXG4nICtcbiAgICAnICAgICAgYXJpYS1sYWJlbD1cInt7Z2V0U29ydERpcmVjdGlvbkFyaWFMYWJlbCgpfX1cIj5cXG4nICtcbiAgICAnICAgICAgPGlcXG4nICtcbiAgICAnICAgICAgIG5nLWNsYXNzPVwieyBcXCd1aS1ncmlkLWljb24tdXAtZGlyXFwnOiBjb2wuc29ydC5kaXJlY3Rpb24gPT0gYXNjLCBcXCd1aS1ncmlkLWljb24tZG93bi1kaXJcXCc6IGNvbC5zb3J0LmRpcmVjdGlvbiA9PSBkZXNjLCBcXCd1aS1ncmlkLWljb24tYmxhbmtcXCc6ICFjb2wuc29ydC5kaXJlY3Rpb24gfVwiXFxuJyArXG4gICAgJyAgICAgICB0aXRsZT1cInt7aXNTb3J0UHJpb3JpdHlWaXNpYmxlKCkgPyBpMThuLmhlYWRlckNlbGwucHJpb3JpdHkgKyBcXCcgXFwnICsgKCBjb2wuc29ydC5wcmlvcml0eSArIDEgKSAgOiBudWxsfX1cIlxcbicgK1xuICAgICcgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XFxuJyArXG4gICAgJyAgICAgPC9pPlxcbicgK1xuICAgICcgICAgIDxzdWJcXG4nICtcbiAgICAnICAgICAgIHVpLWdyaWQtdmlzaWJsZT1cImlzU29ydFByaW9yaXR5VmlzaWJsZSgpXCJcXG4nICtcbiAgICAnICAgICAgIGNsYXNzPVwidWktZ3JpZC1zb3J0LXByaW9yaXR5LW51bWJlclwiPlxcbicgK1xuICAgICcgICAgICAge3tjb2wuc29ydC5wcmlvcml0eSArIDF9fVxcbicgK1xuICAgICcgICAgIDwvc3ViPlxcbicgK1xuICAgICcgICAgPC9zcGFuPlxcbicgK1xuICAgICcgIDwvbWQtYnV0dG9uPlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICA8ZGl2IHVpLWdyaWQtZmlsdGVyPjwvZGl2PlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMvdWlHcmlkSGVhZGVyQ2VsbC5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kYXRlLmh0bWwnLFxuICAgICc8ZGl2IGxheW91dD1cInJvd1wiIGxheW91dC1hbGlnbj1cImNlbnRlciBjZW50ZXJcIj5cXG4nICtcbiAgICAnICAgIDxsYWJlbCBuZy1iaW5kPVwiZmlsdGVyLmNvbHVtbi5kaXNwbGF5TmFtZVwiPjwvbGFiZWw+XFxuJyArXG4gICAgJyAgICA8bWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgICAgIDxsYWJlbD57e1xcJ3QuRnJvbVxcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9sYWJlbD5cXG4nICtcbiAgICAnICAgICAgICA8bWQtZGF0ZXBpY2tlciBuZy1tb2RlbD1cImZpbHRlci5mcm9tXCIgbmctY2hhbmdlPVwiZmlsdGVyLnRvID0gZmlsdGVyLmZyb20gJiYgZmlsdGVyLnRvICYmIGZpbHRlci50byA8IGZpbHRlci5mcm9tID8gZmlsdGVyLmZyb20gOiBmaWx0ZXIudG9cIj48L21kLWRhdGVwaWNrZXI+XFxuJyArXG4gICAgJyAgICA8L21kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgIDxtZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICAgICAgPGxhYmVsPnt7XFwndC5Ub1xcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9sYWJlbD5cXG4nICtcbiAgICAnICAgICAgICA8bWQtZGF0ZXBpY2tlciBuZy1tb2RlbD1cImZpbHRlci50b1wiIG5nLWNoYW5nZT1cImZpbHRlci5mcm9tID0gZmlsdGVyLmZyb20gJiYgZmlsdGVyLnRvICYmIGZpbHRlci5mcm9tID4gZmlsdGVyLnRvID8gZmlsdGVyLnRvIDogZmlsdGVyLmZyb21cIj48L21kLWRhdGVwaWNrZXI+XFxuJyArXG4gICAgJyAgICA8L21kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGF0ZS5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kaWFsb2cuaHRtbCcsXG4gICAgJzxtZC1kaWFsb2cgY2xhc3M9XCJ4cC1ncmlkZmlsdGVyXCIgYXJpYS1sYWJlbD1cIkdyaWRGaWx0ZXJcIiBsYXlvdXQtcGFkZGluZz5cXG4nICtcbiAgICAnICAgIDxkaXYgY2xhc3M9XCJkaWFsb2dIZWFkZXJcIiBmbGV4PVwiYXV0b1wiPlxcbicgK1xuICAgICcgICAgICAgIDxzcGFuPnt7XFwndC5GaWx0ZXJzXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlIH19PC9zcGFuPlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICAgICAgICA8eHAtYXV0b2NvbXBsZXRlXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLWZsb2F0aW5nLWxhYmVsPVwie3sgXFwndC5DaG9vc2VBQ29sdW1uXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlIH19XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtaXRlbXM9XCJjb2x1bW5zXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtaXRlbS10ZXh0PVwiaXRlbS5kaXNwbGF5TmFtZVwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLXNlYXJjaC10ZXh0PVwiYXV0b0NvbXBsZXRlVGV4dFwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLXNlbGVjdGVkLWl0ZW09XCJzZWxlY3RlZENvbHVtblwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLXNlbGVjdGVkLWl0ZW0tY2hhbmdlPVwic2VsZWN0ZWRDb2x1bW5DaGFuZ2VkKGl0ZW0pXCIvPlxcbicgK1xuICAgICcgICAgPC9kaXY+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgICAgPG1kLWRpYWxvZy1jb250ZW50IGZsZXg9XCIxMDBcIj5cXG4nICtcbiAgICAnICAgICAgICA8bWQtbGlzdD5cXG4nICtcbiAgICAnICAgICAgICAgICAgPG1kLWxpc3QtaXRlbSBjbGFzcz1cInNlY29uZGFyeS1idXR0b24tcGFkZGluZyB4cC1ncmlkZmlsdGVyLWl0ZW1cIiBuZy1yZXBlYXQ9XCJmaWx0ZXIgaW4gZmlsdGVyc1wiPlxcbicgK1xuICAgICcgICAgICAgICAgICAgICAgPG5nLWluY2x1ZGUgZmxleD1cImF1dG9cIiBzcmM9XCJcXCcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItXFwnICsgKGZpbHRlci5jb2x1bW4uY29sdW1uRGVmLmZpbHRlclR5cGUgfHwgXFwnc3RyaW5nXFwnKSArIFxcJy5odG1sXFwnXCI+PC9uZy1pbmNsdWRlPlxcbicgK1xuICAgICcgICAgICAgICAgICAgICAgPG1kLWJ1dHRvbiBhcmlhLWxhYmVsPVwiUmVtb3ZlRmlsdGVyXCIgY2xhc3M9XCJtZC1zZWNvbmRhcnlcIiBuZy1jbGljaz1cInJlbW92ZUZpbHRlcihmaWx0ZXIpXCI+PG5nLW1kLWljb24gaWNvbj1cImRlbGV0ZVwiPjwvbmctbWQtaWNvbj48L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnICAgICAgICAgICAgPC9tZC1saXN0LWl0ZW0+XFxuJyArXG4gICAgJyAgICAgICAgPC9tZC1saXN0PlxcbicgK1xuICAgICcgICAgPC9tZC1kaWFsb2ctY29udGVudD5cXG4nICtcbiAgICAnXFxuJyArXG4gICAgJyAgICA8bWQtZGlhbG9nLWFjdGlvbnMgZmxleD1cImF1dG9cIj5cXG4nICtcbiAgICAnICAgICAgICA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJEZWxldGVBbGxcIiBuZy1jbGljaz1cImZpbHRlcnMgPSBbXVwiIG5nLWRpc2FibGVkPVwiIWZpbHRlcnMubGVuZ3RoXCI+e3tcXCd0LkRlbGV0ZUFsbFxcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9tZC1idXR0b24+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWJ1dHRvbiBhcmlhLWxhYmVsPVwiQ2FuY2VsXCIgbmctY2xpY2s9XCJjYW5jZWwoKVwiPnt7XFwndC5DYW5jZWxcXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbWQtYnV0dG9uPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIkFwcGx5XCIgbmctY2xpY2s9XCJhcHBseShmaWx0ZXJzKVwiPnt7XFwndC5BcHBseVxcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9tZC1idXR0b24+XFxuJyArXG4gICAgJyAgICA8L21kLWRpYWxvZy1hY3Rpb25zPlxcbicgK1xuICAgICc8L21kLWRpYWxvZz4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kaWFsb2cuaHRtbFwiOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItbnVtYmVyLmh0bWwnLFxuICAgICc8ZGl2IGxheW91dD1cInJvd1wiIGxheW91dC1hbGlnbj1cImNlbnRlciBjZW50ZXJcIj5cXG4nICtcbiAgICAnICAgIDxsYWJlbCBuZy1iaW5kPVwiZmlsdGVyLmNvbHVtbi5kaXNwbGF5TmFtZVwiPjwvbGFiZWw+XFxuJyArXG4gICAgJyAgICA8bWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgICAgIDxsYWJlbD57e1xcJ3QuRnJvbVxcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9sYWJlbD5cXG4nICtcbiAgICAnICAgICAgICA8bWQtaW5wdXQgbmctbW9kZWw9XCJmaWx0ZXIuZnJvbVwiPjwvbWQtaW5wdXQ+XFxuJyArXG4gICAgJyAgICA8L21kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgIDxtZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICAgICAgPGxhYmVsPnt7XFwndC5Ub1xcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9sYWJlbD5cXG4nICtcbiAgICAnICAgICAgICA8bWQtaW5wdXQgbmctbW9kZWw9XCJmaWx0ZXIudG9cIj48L21kLWlucHV0PlxcbicgK1xuICAgICcgICAgPC9tZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJzwvZGl2PicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLW51bWJlci5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1zdHJpbmcuaHRtbCcsXG4gICAgJzxtZC1pbnB1dC1jb250YWluZXIgY2xhc3M9XCJtZC1ibG9ja1wiPlxcbicgK1xuICAgICcgIDxsYWJlbCBuZy1iaW5kPVwiZmlsdGVyLmNvbHVtbi5kaXNwbGF5TmFtZVwiPjwvbGFiZWw+XFxuJyArXG4gICAgJyAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmctbW9kZWw9XCJmaWx0ZXIudmFsdWVcIiByZXF1aXJlZD5cXG4nICtcbiAgICAnPC9tZC1pbnB1dC1jb250YWluZXI+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItc3RyaW5nLmh0bWxcIjsiLCJSeC5PYnNlcnZhYmxlLnByb3RvdHlwZS4kYXBwbHkgPSBmdW5jdGlvbiAoc2NvcGUsIHRoaXNBcmcpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHJldHVybiBuZXcgUnguQW5vbnltb3VzT2JzZXJ2YWJsZShmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcclxuICAgICAgICByZXR1cm4gc2VsZi5zdWJzY3JpYmUoXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkgeyBvYnNlcnZlci5vbk5leHQoZSk7IH0pO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxyXG4gICAgICAgICAgICBvYnNlcnZlci5vbkNvbXBsZXRlZC5iaW5kKG9ic2VydmVyKVxyXG4gICAgICAgICk7XHJcbiAgICB9KTtcclxufTsiLCJhbmd1bGFyXHJcbiAgICAubW9kdWxlKCd4cC5jb21wb25lbnRzJywgWyduZ01hdGVyaWFsJywgJ25nTWRJY29ucycsICd1aS5ncmlkJywgJ3VpLmdyaWQucmVzaXplQ29sdW1ucycsICd1aS5ncmlkLm1vdmVDb2x1bW5zJywgJ3VpLmdyaWQuaW5maW5pdGVTY3JvbGwnXSlcclxuXHJcbiAgICAvLyBkaXJlY3RpdmVzXHJcbiAgICAuZGlyZWN0aXZlKCd4cEF1dG9jb21wbGV0ZScsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy94cC1hdXRvY29tcGxldGUnKSlcclxuICAgIC5kaXJlY3RpdmUoJ3hwR3JpZCcsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy94cC1ncmlkJykpXHJcbiAgICAuZGlyZWN0aXZlKCd4cEdyaWRmaWx0ZXJCdXR0b24nLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMveHAtZ3JpZGZpbHRlci1idXR0b24nKSlcclxuXHJcbiAgICAvLyBmaWx0ZXJzXHJcbiAgICAuZmlsdGVyKCd4cENvbXBvbmVudHNUcmFuc2xhdGUnLCByZXF1aXJlKCcuL2ZpbHRlcnMveHBDb21wb25lbnRzVHJhbnNsYXRlJykpXHJcblxyXG4gICAgLy8gc2VydmljZXMgIFxyXG4gICAgLmZhY3RvcnkoJ3hwR3JpZGZpbHRlckRpYWxvZycsIHJlcXVpcmUoJy4vc2VydmljZXMveHBHcmlkZmlsdGVyRGlhbG9nJykpXHJcbiAgICAuZmFjdG9yeSgneHBHcmlkU2VydmljZScsIHJlcXVpcmUoJy4vc2VydmljZXMveHBHcmlkU2VydmljZScpKVxyXG4gICAgLmZhY3RvcnkoJ3hwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UnLCByZXF1aXJlKCcuL3NlcnZpY2VzL3hwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UnKSlcclxuXHJcbiAgICAvLyB0ZW1wbGF0ZXNcclxuICAgIC5ydW4ocmVxdWlyZSgnLi90ZW1wbGF0ZXMnKSk7XHJcblxyXG5yZXF1aXJlKCcuL3V0aWxzL3J4Jyk7XHJcbiJdfQ==
