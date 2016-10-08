(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function searchableString(a) {
    return (a || '').toLowerCase();
}

/// example
///
///     <xp-autocomplete xp-items="item in items" xp-item-text="item.display"></xp-autocomplete>
///

module.exports = ['$parse', '$http', function ($parse, http) {
    return {
        restrict: 'E',
        scope: {
            xpFetch: '@',
            xpItems: '=?',
            xpSearchText: '=?',
            xpSelectedItem: '=?',
            xpFloatingLabel: '@',
            xpValue: '=?'
        },
        template: function template(element, attrs) {
            return '<md-autocomplete\n                md-items="item in _items"\n                md-item-text="' + attrs.xpItemText + '"\n                md-search-text="xpSearchText"\n                md-search-text-change="' + attrs.xpSearchTextChange + '"\n                md-selected-item="xpSelectedItem"\n                md-selected-item-change="selectedItemChange(xpSelectedItem)"\n                md-min-length="0"\n                md-autoselect="true"\n                md-match-case-insensitive="true"\n                md-input-name="' + attrs.xpInputName + '"\n                md-floating-label="{{xpFloatingLabel}}">\n                    <md-item-template>\n                        <span md-highlight-text="xpSearchText" md-highlight-flags="i">{{' + attrs.xpItemText + '}}</span>\n                    </md-item-template>\n            </md-autocomplete>';
        },
        link: function link(scope, element, attrs) {
            var getItemText = $parse(attrs.xpItemText);
            var items;

            scope._items = [];
            scope._search_text = '';

            if (attrs.xpFetch) http({ url: attrs.xpFetch }).then(function (e) {
                return scope.xpItems = e.data;
            });

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
    '    ui-grid-cell ng-click="$parent.$parent.$parent.$parent.$parent.$parent.$parent.rowClick({ event: $event, row: row.entity, col: col })">\n' +
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGRpcmVjdGl2ZXNcXHhwLWF1dG9jb21wbGV0ZS5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZC5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZGZpbHRlci1idXR0b24uanMiLCJzcmNcXGZpbHRlcnNcXHhwQ29tcG9uZW50c1RyYW5zbGF0ZS5qcyIsInNyY1xcc2VydmljZXNcXHhwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UuanMiLCJzcmNcXHNlcnZpY2VzXFx4cEdyaWRTZXJ2aWNlLmpzIiwic3JjXFxzZXJ2aWNlc1xceHBHcmlkZmlsdGVyRGlhbG9nLmpzIiwic3JjXFx0ZW1wbGF0ZXNcXGluZGV4LmpzIiwic3JjL3RlbXBsYXRlcy91aS1ncmlkLWhlYWRlci5odG1sIiwic3JjL3RlbXBsYXRlcy91aS1ncmlkLXJvdy5odG1sIiwic3JjL3RlbXBsYXRlcy91aUdyaWRIZWFkZXJDZWxsLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGF0ZS5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLW51bWJlci5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sIiwic3JjXFx1dGlsc1xccnguanMiLCJzcmNcXGxpYi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUEsU0FBUyxnQkFBVCxDQUEwQixDQUExQixFQUE2QjtBQUN6QixXQUFPLENBQUMsS0FBSyxFQUFOLEVBQVUsV0FBVixFQUFQO0FBQ0g7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLENBQUMsUUFBRCxFQUFXLE9BQVgsRUFBb0IsVUFBVSxNQUFWLEVBQWtCLElBQWxCLEVBQXdCO0FBQ3pELFdBQU87QUFDSCxrQkFB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LENBRDdCOztBQUdJO0FBSEosQ0FJSyxTQUpMLENBSWUsZ0JBSmYsRUFJaUMsUUFBUSw4QkFBUixDQUpqQyxFQUtLLFNBTEwsQ0FLZSxRQUxmLEVBS3lCLFFBQVEsc0JBQVIsQ0FMekIsRUFNSyxTQU5MLENBTWUsb0JBTmYsRUFNcUMsUUFBUSxtQ0FBUixDQU5yQzs7QUFRSTtBQVJKLENBU0ssTUFUTCxDQVNZLHVCQVRaLEVBU3FDLFFBQVEsaUNBQVIsQ0FUckM7O0FBV0k7QUFYSixDQVlLLE9BWkwsQ0FZYSxvQkFaYixFQVltQyxRQUFRLCtCQUFSLENBWm5DLEVBYUssT0FiTCxDQWFhLGVBYmIsRUFhOEIsUUFBUSwwQkFBUixDQWI5QixFQWNLLE9BZEwsQ0FjYSw4QkFkYixFQWM2QyxRQUFRLHlDQUFSLENBZDdDOztBQWdCSTtBQWhCSixDQWlCSyxHQWpCTCxDQWlCUyxRQUFRLGFBQVIsQ0FqQlQ7O0FBbUJBLFFBQVEsWUFBUiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBzZWFyY2hhYmxlU3RyaW5nKGEpIHtcclxuICAgIHJldHVybiAoYSB8fCAnJykudG9Mb3dlckNhc2UoKTsgICAgICAgIFxyXG59XHJcblxyXG4vLy8gZXhhbXBsZVxyXG4vLy9cclxuLy8vICAgICA8eHAtYXV0b2NvbXBsZXRlIHhwLWl0ZW1zPVwiaXRlbSBpbiBpdGVtc1wiIHhwLWl0ZW0tdGV4dD1cIml0ZW0uZGlzcGxheVwiPjwveHAtYXV0b2NvbXBsZXRlPlxyXG4vLy9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gWyckcGFyc2UnLCAnJGh0dHAnLCBmdW5jdGlvbiAoJHBhcnNlLCBodHRwKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHJlc3RyaWN0OiAnRScsXHJcbiAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgeHBGZXRjaDogJ0AnLFxyXG4gICAgICAgICAgICB4cEl0ZW1zOiAnPT8nLFxyXG4gICAgICAgICAgICB4cFNlYXJjaFRleHQ6ICc9PycsXHJcbiAgICAgICAgICAgIHhwU2VsZWN0ZWRJdGVtOiAnPT8nLFxyXG4gICAgICAgICAgICB4cEZsb2F0aW5nTGFiZWw6ICdAJyxcclxuICAgICAgICAgICAgeHBWYWx1ZTogJz0/J1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGU6IGZ1bmN0aW9uIChlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICByZXR1cm4gYDxtZC1hdXRvY29tcGxldGVcclxuICAgICAgICAgICAgICAgIG1kLWl0ZW1zPVwiaXRlbSBpbiBfaXRlbXNcIlxyXG4gICAgICAgICAgICAgICAgbWQtaXRlbS10ZXh0PVwiJHthdHRycy54cEl0ZW1UZXh0fVwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWFyY2gtdGV4dD1cInhwU2VhcmNoVGV4dFwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWFyY2gtdGV4dC1jaGFuZ2U9XCIke2F0dHJzLnhwU2VhcmNoVGV4dENoYW5nZX1cIlxyXG4gICAgICAgICAgICAgICAgbWQtc2VsZWN0ZWQtaXRlbT1cInhwU2VsZWN0ZWRJdGVtXCJcclxuICAgICAgICAgICAgICAgIG1kLXNlbGVjdGVkLWl0ZW0tY2hhbmdlPVwic2VsZWN0ZWRJdGVtQ2hhbmdlKHhwU2VsZWN0ZWRJdGVtKVwiXHJcbiAgICAgICAgICAgICAgICBtZC1taW4tbGVuZ3RoPVwiMFwiXHJcbiAgICAgICAgICAgICAgICBtZC1hdXRvc2VsZWN0PVwidHJ1ZVwiXHJcbiAgICAgICAgICAgICAgICBtZC1tYXRjaC1jYXNlLWluc2Vuc2l0aXZlPVwidHJ1ZVwiXHJcbiAgICAgICAgICAgICAgICBtZC1pbnB1dC1uYW1lPVwiJHthdHRycy54cElucHV0TmFtZX1cIlxyXG4gICAgICAgICAgICAgICAgbWQtZmxvYXRpbmctbGFiZWw9XCJ7e3hwRmxvYXRpbmdMYWJlbH19XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgPG1kLWl0ZW0tdGVtcGxhdGU+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIG1kLWhpZ2hsaWdodC10ZXh0PVwieHBTZWFyY2hUZXh0XCIgbWQtaGlnaGxpZ2h0LWZsYWdzPVwiaVwiPnt7JHthdHRycy54cEl0ZW1UZXh0fX19PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgIDwvbWQtaXRlbS10ZW1wbGF0ZT5cclxuICAgICAgICAgICAgPC9tZC1hdXRvY29tcGxldGU+YDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgdmFyIGdldEl0ZW1UZXh0ID0gJHBhcnNlKGF0dHJzLnhwSXRlbVRleHQpO1xyXG4gICAgICAgICAgICB2YXIgaXRlbXM7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5faXRlbXMgPSBbXTtcclxuICAgICAgICAgICAgc2NvcGUuX3NlYXJjaF90ZXh0ID0gJyc7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXR0cnMueHBGZXRjaClcclxuICAgICAgICAgICAgICAgIGh0dHAoeyB1cmw6IGF0dHJzLnhwRmV0Y2ggfSkudGhlbihlID0+IHNjb3BlLnhwSXRlbXMgPSBlLmRhdGEpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuc2VsZWN0ZWRJdGVtQ2hhbmdlID0gaXRlbSA9PiBzY29wZS4kcGFyZW50LiRldmFsKGF0dHJzLnhwU2VsZWN0ZWRJdGVtQ2hhbmdlLCB7IGl0ZW0gfSk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goYFt4cEl0ZW1zLHhwU2VhcmNoVGV4dF1gLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGl0ZW1zID0gZVswXSB8fCBbXTtcclxuICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gZVsxXSB8fCAnJztcclxuICAgICAgICAgICAgICAgIHZhciBhcnJheSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgIHRleHQgPSBzZWFyY2hhYmxlU3RyaW5nKHRleHQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0ZXh0IHx8IHNlYXJjaGFibGVTdHJpbmcoZ2V0SXRlbVRleHQoc2NvcGUsIHsgaXRlbTogaXRlbXNbaV0gfSkpLmluZGV4T2YodGV4dCkgIT09IC0xKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheS5wdXNoKGl0ZW1zW2ldKTtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5faXRlbXMgPSBhcnJheTtcclxuXHJcbiAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1dOyIsIm1vZHVsZS5leHBvcnRzID0gWyckcScsICckaHR0cCcsIGZ1bmN0aW9uICgkcSwgJGh0dHApIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZTogdHJ1ZSxcclxuICAgICAgICB0ZW1wbGF0ZTogYDxkaXYgbGF5b3V0PVwiY29sdW1uXCIgY2xhc3M9XCJ4cC1ncmlkXCI+XHJcbiAgICAgICAgICAgIDx4cC1ncmlkZmlsdGVyLWJ1dHRvbiB4cC1ncmlkLW9wdGlvbnM9XCJvcHRpb25zXCIgbGF5b3V0PVwicm93XCIgbGF5b3V0LWFsaWduPVwiZW5kIGNlbnRlclwiPjwveHAtZ3JpZGZpbHRlci1idXR0b24+XHJcbiAgICAgICAgICAgIDxkaXYgdWktZ3JpZD1cIm9wdGlvbnNcIiBmbGV4IHVpLWdyaWQtcmVzaXplLWNvbHVtbnMgdWktZ3JpZC1tb3ZlLWNvbHVtbnMgdWktZ3JpZC1pbmZpbml0ZS1zY3JvbGw+PC9kaXY+XHJcbiAgICAgICAgPC9kaXY+YCxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgc29ydDtcclxuICAgICAgICAgICAgdmFyIG11c3RSZWxvYWQ7XHJcbiAgICAgICAgICAgIHZhciBwYWdlID0gMDtcclxuICAgICAgICAgICAgdmFyIHJlZnJlc2ggPSBuZXcgUnguU3ViamVjdCgpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUub3B0aW9ucyA9IHNjb3BlLiRwYXJlbnQuJGV2YWwoYXR0cnMueHBHcmlkT3B0aW9ucyB8fCAne30nKSB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0gYW5ndWxhci5leHRlbmQoc2NvcGUub3B0aW9ucywge1xyXG4gICAgICAgICAgICAgICAgZGF0YTogW10sXHJcbiAgICAgICAgICAgICAgICBpbmZpbml0ZVNjcm9sbFJvd3NGcm9tRW5kOiAxMDAsXHJcbiAgICAgICAgICAgICAgICBpbmZpbml0ZVNjcm9sbERvd246IHRydWUsXHJcbiAgICAgICAgICAgICAgICBvblJlZ2lzdGVyQXBpOiBmdW5jdGlvbiAoZ3JpZEFwaSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLm9wdGlvbnMuZ3JpZEFwaSA9IGdyaWRBcGk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZEFwaS5jb3JlLm9uLnNvcnRDaGFuZ2VkKHNjb3BlLCBzb3J0Q2hhbmdlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc29ydENoYW5nZWQoZ3JpZEFwaS5ncmlkLCBbb3B0aW9ucy5jb2x1bW5EZWZzWzFdXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZEFwaS5pbmZpbml0ZVNjcm9sbC5vbi5uZWVkTG9hZE1vcmVEYXRhKHNjb3BlLCBuZWVkTG9hZE1vcmVEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBvcHRpb25zLnJlZnJlc2ggPSBfID0+IHJlZnJlc2gub25OZXh0KHRydWUpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKCdvcHRpb25zLmNvbHVtbkRlZnMnLCBjb2x1bW5zID0+IHNjb3BlLmZpbHRlcnMgPSBjb21wdXRlRmlsdGVycyhjb2x1bW5zKSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHNjb3BlLiR3YXRjaCgnZmlsdGVycycsIF8gPT4gcmVmcmVzaC5vbk5leHQodHJ1ZSksIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUucm93Q2xpY2sgPSBmdW5jdGlvbiByb3dDbGljayhlKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLnNlbGVjdGVkUm93ID0gZS5yb3c7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMucm93Q2xpY2spXHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5yb3dDbGljayhlKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIG5lZWRMb2FkTW9yZURhdGEoKSB7XHJcbiAgICAgICAgICAgICAgICByZWZyZXNoLm9uTmV4dChmYWxzZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHNvcnRDaGFuZ2VkKGdyaWQsIHNvcnRDb2x1bW5zKSB7XHJcbiAgICAgICAgICAgICAgICBzb3J0ID0gY29tcHV0ZVNvcnRTdHJpbmcoc29ydENvbHVtbnMpO1xyXG4gICAgICAgICAgICAgICAgcmVmcmVzaC5vbk5leHQodHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlZnJlc2hcclxuICAgICAgICAgICAgICAgIC5tYXAoZSA9PiBtdXN0UmVsb2FkIHw9IGUpXHJcbiAgICAgICAgICAgICAgICAuZGVib3VuY2UoMSlcclxuICAgICAgICAgICAgICAgIC4kYXBwbHkoc2NvcGUpXHJcbiAgICAgICAgICAgICAgICAuZmxhdE1hcExhdGVzdChmdW5jdGlvbiAocmVsb2FkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXVzdFJlbG9hZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2UgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5zZWxlY3RlZFJvdyA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gYW5ndWxhci5leHRlbmQoeyBwYWdlLCBzb3J0LCBwYWdlU2l6ZTogMTAwIH0sIHNjb3BlLmZpbHRlcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSB0eXBlb2Ygb3B0aW9ucy5mZXRjaCA9PT0gJ3N0cmluZycgPyAkaHR0cCh7IHVybDogb3B0aW9ucy5mZXRjaCwgcGFyYW1zIH0pIDogb3B0aW9ucy5mZXRjaChwYXJhbXMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5zdWJzY3JpYmUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IFJ4Lk9ic2VydmFibGUuZnJvbVByb21pc2UoJHEud2hlbihyZXN1bHQpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5jYXRjaChfID0+IFJ4Lk9ic2VydmFibGUuZW1wdHkoKSk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLiRhcHBseShzY29wZSlcclxuICAgICAgICAgICAgICAgIC50YXAoZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5kYXRhKSBkYXRhID0gZGF0YS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UrKztcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEgPSBvcHRpb25zLmRhdGEuY29uY2F0KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLm9wdGlvbnMuZ3JpZEFwaS5pbmZpbml0ZVNjcm9sbC5kYXRhTG9hZGVkKGZhbHNlLCBkYXRhLmxlbmd0aCA+PSAxMDApO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1dO1xyXG5cclxuZnVuY3Rpb24gY29tcHV0ZUZpbHRlcnMoY29sdW1ucykge1xyXG4gICAgdmFyIG8gPSB7fTtcclxuXHJcbiAgICBpZiAoY29sdW1ucylcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGNvbHVtbiA9IGNvbHVtbnNbaV07XHJcbiAgICAgICAgICAgIHZhciBmaWx0ZXJzID0gY29sdW1uLmZpbHRlcnMgfHwgW107XHJcblxyXG4gICAgICAgICAgICBpZiAoZmlsdGVycy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICBvW2NvbHVtbi5uYW1lXSA9IGZpbHRlcnM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIHJldHVybiBvO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb21wdXRlU29ydFN0cmluZyhzb3J0Q29sdW1ucykge1xyXG4gICAgdmFyIHMgPSAnJztcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvcnRDb2x1bW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHMpIHMgKz0gJywnO1xyXG5cclxuICAgICAgICB2YXIgY29sID0gc29ydENvbHVtbnNbaV07XHJcbiAgICAgICAgaWYgKGNvbC5zb3J0KVxyXG4gICAgICAgICAgICBzICs9IGNvbC5uYW1lICsgJzonICsgY29sLnNvcnQuZGlyZWN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSBbJ3hwR3JpZGZpbHRlckRpYWxvZycsICckcGFyc2UnLCBmdW5jdGlvbiAoeHBHcmlkZmlsdGVyRGlhbG9nLCBwYXJzZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzY29wZTogdHJ1ZSxcclxuICAgICAgICB0ZW1wbGF0ZTogYDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIkZpbHRlclwiIG5nLWNsaWNrPVwic2hvd0RpYWxvZygpXCIgbmctY2xhc3M9XCJ7J21kLXByaW1hcnknOiBmaWx0ZXJlZCgpfVwiPlxyXG4gICAgICAgICAgICA8bmctbWQtaWNvbiBpY29uPVwiZmlsdGVyX2xpc3RcIj48L25nLW1kLWljb24+XHJcbiAgICAgICAgPC9tZC1idXR0b24+YCxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0gcGFyc2UoYXR0cnMueHBHcmlkT3B0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5maWx0ZXJlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciB7IGNvbHVtbkRlZnMgfSA9IG9wdGlvbnMoc2NvcGUpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICBpZiAoY29sdW1uRGVmcylcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbkRlZnMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW5EZWZzW2ldLmZpbHRlcnMgJiYgY29sdW1uRGVmc1tpXS5maWx0ZXJzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuc2hvd0RpYWxvZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBncmlkT3B0aW9ucyA9IG9wdGlvbnMoc2NvcGUpIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgeHBHcmlkZmlsdGVyRGlhbG9nKHsgZ3JpZE9wdGlvbnMgfSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufV07IiwibW9kdWxlLmV4cG9ydHMgPSBbJ3hwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UnLCBmdW5jdGlvbiAoc2VydmljZSkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHhwQ29tcG9uZW50c1RyYW5zbGF0ZSh2YWx1ZSkge1xyXG4gICAgICAgIHJldHVybiBzZXJ2aWNlKHZhbHVlLnN1YnN0cmluZygyKSkgfHwgdmFsdWU7XHJcbiAgICB9O1xyXG59XTsiLCJtb2R1bGUuZXhwb3J0cyA9IFtmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgdmFyIGN1cnJlbnQgPSAnZW4nO1xyXG5cclxuICAgIHZhciBmID0gZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgIHJldHVybiBmLmxvY2FsZXNbY3VycmVudF1ba2V5XTtcclxuICAgIH1cclxuXHJcbiAgICBmLmxhbmcgPSBmdW5jdGlvbiAobGFuZykge1xyXG4gICAgICAgIGlmICghbGFuZykgcmV0dXJuIGN1cnJlbnQ7XHJcbiAgICAgICAgY3VycmVudCA9IGxhbmc7XHJcbiAgICB9O1xyXG5cclxuICAgIGYubG9jYWxlcyA9IHtcclxuICAgICAgICBlbjoge1xyXG4gICAgICAgICAgICBBcHBseTogJ0FwcGx5JyxcclxuICAgICAgICAgICAgQ2FuY2VsOiAnQ2FuY2VsJyxcclxuICAgICAgICAgICAgQ2hvb3NlQUNvbHVtbjogJ0Nob29zZSBhIGNvbHVtbicsXHJcbiAgICAgICAgICAgIERlbGV0ZUFsbDogJ0RlbGV0ZSBBbGwnLFxyXG4gICAgICAgICAgICBGaWx0ZXJzOiAnRmlsdGVycycsXHJcbiAgICAgICAgICAgIEZyb206ICdGcm9tJyxcclxuICAgICAgICAgICAgVG86ICdUbydcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZyOiB7XHJcbiAgICAgICAgICAgIEFwcGx5OiAnQXBwbGlxdWVyJyxcclxuICAgICAgICAgICAgQ2FuY2VsOiAnQW5udWxlcicsXHJcbiAgICAgICAgICAgIENob29zZUFDb2x1bW46ICdDaG9pc2lzc2V6IHVuZSBjb2xvbm5lJyxcclxuICAgICAgICAgICAgRGVsZXRlQWxsOiAnU3VwcHJpbWVyIHRvdXQnLFxyXG4gICAgICAgICAgICBGaWx0ZXJzOiAnRmlsdHJlcycsXHJcbiAgICAgICAgICAgIEZyb206ICdEZScsXHJcbiAgICAgICAgICAgIFRvOiAnw4AnXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gZjtcclxufV07IiwibW9kdWxlLmV4cG9ydHMgPSBbJyRmaWx0ZXInLCBmdW5jdGlvbiAoJGZpbHRlcikge1xyXG4gICAgY2xhc3MgWHBHcmlkU2VydmljZSB7XHJcbiAgICAgICAgZ2V0Q29sdW1uRGlzcGxheU5hbWUoY29sdW1uRGVmKSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBhbmd1bGFyLmlzVW5kZWZpbmVkKGNvbHVtbkRlZi5kaXNwbGF5TmFtZSkgPyBjb2x1bW5EZWYuZmllbGQgOiBjb2x1bW5EZWYuZGlzcGxheU5hbWU7XHJcblxyXG4gICAgICAgICAgICBpZiAoY29sdW1uRGVmLmhlYWRlckNlbGxGaWx0ZXIpXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSAkZmlsdGVyKGNvbHVtbkRlZi5oZWFkZXJDZWxsRmlsdGVyKShyZXN1bHQpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ldyBYcEdyaWRTZXJ2aWNlKCk7XHJcbn1dOyIsImZ1bmN0aW9uIGNvbHVtbnNDb21wYXJlcihhLCBiKSB7XHJcbiAgICByZXR1cm4gYS5kaXNwbGF5TmFtZSA8IGIuZGlzcGxheU5hbWUgPyAtMSA6IGEuZGlzcGxheU5hbWUgPiBiLmRpc3BsYXlOYW1lID8gMSA6IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRGaWx0ZXJzKGNvbHVtbnMpIHtcclxuICAgIHZhciByZXN1bHQgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgY29sdW1uID0gY29sdW1uc1tpXTtcclxuICAgICAgICB2YXIgZmlsdGVycyA9IGFuZ3VsYXIuY29weShjb2x1bW4uY29sdW1uRGVmLmZpbHRlcnMgfHwgW10pO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGZpbHRlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgdmFyIGZpbHRlciA9IGZpbHRlcnNbal07XHJcbiAgICAgICAgICAgIGZpbHRlci5jb2x1bW4gPSBjb2x1bW47XHJcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZpbHRlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNhdmVGaWx0ZXJzKGNvbHVtbnMsIGZpbHRlcnMpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1ucy5sZW5ndGg7IGkrKylcclxuICAgICAgICBjb2x1bW5zW2ldLmNvbHVtbkRlZi5maWx0ZXJzID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWx0ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGZpbHRlciA9IGZpbHRlcnNbaV07XHJcbiAgICAgICAgZmlsdGVyLmNvbHVtbi5jb2x1bW5EZWYuZmlsdGVycy5wdXNoKGZpbHRlcik7XHJcbiAgICAgICAgZGVsZXRlIGZpbHRlci5jb2x1bW47XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gWyckbWREaWFsb2cnLCAnJHRpbWVvdXQnLCBmdW5jdGlvbiAoJG1kRGlhbG9nLCAkdGltZW91dCkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcbiAgICAgICAgdmFyIHsgZ3JpZE9wdGlvbnMgfSA9IG9wdGlvbnM7XHJcblxyXG4gICAgICAgIHZhciBkaWFsb2cgPSB7XHJcbiAgICAgICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcbiAgICAgICAgICAgIGNsaWNrT3V0c2lkZVRvQ2xvc2U6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRtZERpYWxvZycsICd4cEdyaWRTZXJ2aWNlJywgZnVuY3Rpb24gKHNjb3BlLCAkbWREaWFsb2csIHhwR3JpZFNlcnZpY2UpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5jb2x1bW5zID0gZ3JpZE9wdGlvbnNcclxuICAgICAgICAgICAgICAgICAgICAuY29sdW1uRGVmc1xyXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoY29sdW1uRGVmID0+ICh7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW5EZWYsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiB4cEdyaWRTZXJ2aWNlLmdldENvbHVtbkRpc3BsYXlOYW1lKGNvbHVtbkRlZilcclxuICAgICAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgICAgICAuc29ydChjb2x1bW5zQ29tcGFyZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmZpbHRlcnMgPSBsb2FkRmlsdGVycyhzY29wZS5jb2x1bW5zKTtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5hcHBseSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNhdmVGaWx0ZXJzKHNjb3BlLmNvbHVtbnMsIHNjb3BlLmZpbHRlcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICRtZERpYWxvZy5oaWRlKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuY2FuY2VsID0gXyA9PiAkbWREaWFsb2cuY2FuY2VsKCk7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5hdXRvQ29tcGxldGVUZXh0ID0gJyc7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5zZWxlY3RlZENvbHVtbiA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUucmVtb3ZlRmlsdGVyID0gZnVuY3Rpb24gKGZpbHRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHNjb3BlLmZpbHRlcnMuaW5kZXhPZihmaWx0ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmZpbHRlcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gd2hlbiBhIGNvbHVtbiBpcyBzZWxlY3RlZCBpbiB0aGUgYXV0b2NvbXBsZXRlXHJcbiAgICAgICAgICAgICAgICBzY29wZS5zZWxlY3RlZENvbHVtbkNoYW5nZWQgPSBmdW5jdGlvbiAoc2VsZWN0ZWRDb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXNlbGVjdGVkQ29sdW1uKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBjb2x1bW5zIHRvIHRoZSBsaXN0IG9mIGZpbHRlcnMgZm9yIGVkaXRpbmcuXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsdGVycy51bnNoaWZ0KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBzZWxlY3RlZENvbHVtblxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNsZWFyIHRoZSBhdXRvY29tcGxldGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuYXV0b0NvbXBsZXRlVGV4dCA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5zZWxlY3RlZENvbHVtbiA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcueHAtZ3JpZGZpbHRlci1pdGVtIGlucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XSxcclxuICAgICAgICAgICAgZXNjYXBlVG9DbG9zZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGlhbG9nLmh0bWwnXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuICRtZERpYWxvZy5zaG93KGRpYWxvZyk7XHJcbiAgICB9O1xyXG59XTsiLCJyZXF1aXJlKCcuL3hwLWdyaWRmaWx0ZXItZGF0ZS5odG1sJyk7XHJcbnJlcXVpcmUoJy4veHAtZ3JpZGZpbHRlci1kaWFsb2cuaHRtbCcpO1xyXG5yZXF1aXJlKCcuL3hwLWdyaWRmaWx0ZXItbnVtYmVyLmh0bWwnKTtcclxucmVxdWlyZSgnLi94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sJyk7XHJcblxyXG52YXIgdWlHcmlkSGVhZGVyQ2VsbCA9IHJlcXVpcmUoJy4vdWlHcmlkSGVhZGVyQ2VsbC5odG1sJyk7XHJcbnZhciB1aUdyaWRSb3cgPSByZXF1aXJlKCcuL3VpLWdyaWQtcm93Lmh0bWwnKTtcclxudmFyIHVpR3JpZEhlYWRlciA9IHJlcXVpcmUoJy4vdWktZ3JpZC1oZWFkZXIuaHRtbCcpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgIC8vUmVwbGFjZSB1aS1ncmlkIHRlbXBsYXRlcyBcclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgndWktZ3JpZC91aUdyaWRIZWFkZXJDZWxsJywgJHRlbXBsYXRlQ2FjaGUuZ2V0KHVpR3JpZEhlYWRlckNlbGwpKTtcclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgndWktZ3JpZC91aS1ncmlkLXJvdycsICR0ZW1wbGF0ZUNhY2hlLmdldCh1aUdyaWRSb3cpKTtcclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgndWktZ3JpZC91aS1ncmlkLWhlYWRlcicsICR0ZW1wbGF0ZUNhY2hlLmdldCh1aUdyaWRIZWFkZXIpKTtcclxufV07IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMvdWktZ3JpZC1oZWFkZXIuaHRtbCcsXG4gICAgJzxkaXZcXG4nICtcbiAgICAnICByb2xlPVwicm93Z3JvdXBcIlxcbicgK1xuICAgICcgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXJcIj4gPCEtLSB0aGVhZGVyIC0tPlxcbicgK1xuICAgICcgIDxkaXZcXG4nICtcbiAgICAnICAgIGNsYXNzPVwidWktZ3JpZC10b3AtcGFuZWxcIj5cXG4nICtcbiAgICAnICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci12aWV3cG9ydFwiPlxcbicgK1xuICAgICcgICAgICA8ZGl2XFxuJyArXG4gICAgJyAgICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jYW52YXNcIj5cXG4nICtcbiAgICAnICAgICAgICA8ZGl2XFxuJyArXG4gICAgJyAgICAgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNlbGwtd3JhcHBlclwiXFxuJyArXG4gICAgJyAgICAgICAgICBuZy1zdHlsZT1cImNvbENvbnRhaW5lci5oZWFkZXJDZWxsV3JhcHBlclN0eWxlKClcIj5cXG4nICtcbiAgICAnICAgICAgICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgICAgICAgcm9sZT1cInJvd1wiXFxuJyArXG4gICAgJyAgICAgICAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2VsbC1yb3dcIj5cXG4nICtcbiAgICAnICAgICAgICAgICAgPGRpdlxcbicgK1xuICAgICcgICAgICAgICAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2VsbCB1aS1ncmlkLWNsZWFyZml4XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgICBuZy1yZXBlYXQ9XCJjb2wgaW4gY29sQ29udGFpbmVyLnJlbmRlcmVkQ29sdW1ucyB0cmFjayBieSBjb2wudWlkXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgICB1aS1ncmlkLWhlYWRlci1jZWxsXFxuJyArXG4gICAgJyAgICAgICAgICAgICAgbWQtY29sb3JzPVwiOjp7YmFja2dyb3VuZDogXFwnYmFja2dyb3VuZFxcJ31cIlxcbicgK1xuICAgICcgICAgICAgICAgICAgIGNvbD1cImNvbFwiXFxuJyArXG4gICAgJyAgICAgICAgICAgICAgcmVuZGVyLWluZGV4PVwiJGluZGV4XCI+XFxuJyArXG4gICAgJyAgICAgICAgICAgIDwvZGl2PlxcbicgK1xuICAgICcgICAgICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICAgIDwvZGl2PlxcbicgK1xuICAgICcgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgPC9kaXY+XFxuJyArXG4gICAgJzwvZGl2PicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy91aS1ncmlkLWhlYWRlci5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMvdWktZ3JpZC1yb3cuaHRtbCcsXG4gICAgJzxkaXYgbmctcmVwZWF0PVwiKGNvbFJlbmRlckluZGV4LCBjb2wpIGluIGNvbENvbnRhaW5lci5yZW5kZXJlZENvbHVtbnMgdHJhY2sgYnkgY29sLnVpZFwiIHVpLWdyaWQtb25lLWJpbmQtaWQtZ3JpZD1cInJvd1JlbmRlckluZGV4ICsgXFwnLVxcJyArIGNvbC51aWQgKyBcXCctY2VsbFxcJ1wiXFxuJyArXG4gICAgJyAgICBjbGFzcz1cInVpLWdyaWQtY2VsbFwiIG5nLWNsYXNzPVwieyBcXCd1aS1ncmlkLXJvdy1oZWFkZXItY2VsbFxcJzogY29sLmlzUm93SGVhZGVyIH1cIiBtZC1jb2xvcnM9XCI6OntiYWNrZ3JvdW5kOiBcXCdiYWNrZ3JvdW5kLWh1ZS1cXCcgKyAocm93UmVuZGVySW5kZXggJSAyICsgMSl9XCIgcm9sZT1cInt7Y29sLmlzUm93SGVhZGVyID8gXFwncm93aGVhZGVyXFwnIDogXFwnZ3JpZGNlbGxcXCd9fVwiXFxuJyArXG4gICAgJyAgICB1aS1ncmlkLWNlbGwgbmctY2xpY2s9XCIkcGFyZW50LiRwYXJlbnQuJHBhcmVudC4kcGFyZW50LiRwYXJlbnQuJHBhcmVudC4kcGFyZW50LnJvd0NsaWNrKHsgZXZlbnQ6ICRldmVudCwgcm93OiByb3cuZW50aXR5LCBjb2w6IGNvbCB9KVwiPlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMvdWktZ3JpZC1yb3cuaHRtbFwiOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3VpR3JpZEhlYWRlckNlbGwuaHRtbCcsXG4gICAgJzxkaXZcXG4nICtcbiAgICAnICByb2xlPVwiY29sdW1uaGVhZGVyXCJcXG4nICtcbiAgICAnICBuZy1jbGFzcz1cInsgXFwnc29ydGFibGVcXCc6IHNvcnRhYmxlIH1cIlxcbicgK1xuICAgICcgIHVpLWdyaWQtb25lLWJpbmQtYXJpYS1sYWJlbGxlZGJ5LWdyaWQ9XCJjb2wudWlkICsgXFwnLWhlYWRlci10ZXh0IFxcJyArIGNvbC51aWQgKyBcXCctc29ydGRpci10ZXh0XFwnXCJcXG4nICtcbiAgICAnICBhcmlhLXNvcnQ9XCJ7e2NvbC5zb3J0LmRpcmVjdGlvbiA9PSBhc2MgPyBcXCdhc2NlbmRpbmdcXCcgOiAoIGNvbC5zb3J0LmRpcmVjdGlvbiA9PSBkZXNjID8gXFwnZGVzY2VuZGluZ1xcJyA6ICghY29sLnNvcnQuZGlyZWN0aW9uID8gXFwnbm9uZVxcJyA6IFxcJ290aGVyXFwnKSl9fVwiPlxcbicgK1xuICAgICcgIDxtZC1idXR0b25cXG4nICtcbiAgICAnICAgIHJvbGU9XCJidXR0b25cIlxcbicgK1xuICAgICcgICAgdGFiaW5kZXg9XCIwXCJcXG4nICtcbiAgICAnICAgIGNsYXNzPVwidWktZ3JpZC1jZWxsLWNvbnRlbnRzIHVpLWdyaWQtaGVhZGVyLWNlbGwtcHJpbWFyeS1mb2N1c1wiXFxuJyArXG4gICAgJyAgICBjb2wtaW5kZXg9XCJyZW5kZXJJbmRleFwiXFxuJyArXG4gICAgJyAgICB0aXRsZT1cIlRPT0xUSVBcIj5cXG4nICtcbiAgICAnICAgIDxzcGFuXFxuJyArXG4gICAgJyAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2VsbC1sYWJlbFwiXFxuJyArXG4gICAgJyAgICAgIHVpLWdyaWQtb25lLWJpbmQtaWQtZ3JpZD1cImNvbC51aWQgKyBcXCctaGVhZGVyLXRleHRcXCdcIj5cXG4nICtcbiAgICAnICAgICAge3sgY29sLmRpc3BsYXlOYW1lIENVU1RPTV9GSUxURVJTIH19XFxuJyArXG4gICAgJyAgICA8L3NwYW4+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgICAgPHNwYW5cXG4nICtcbiAgICAnICAgICAgdWktZ3JpZC1vbmUtYmluZC1pZC1ncmlkPVwiY29sLnVpZCArIFxcJy1zb3J0ZGlyLXRleHRcXCdcIlxcbicgK1xuICAgICcgICAgICB1aS1ncmlkLXZpc2libGU9XCJjb2wuc29ydC5kaXJlY3Rpb25cIlxcbicgK1xuICAgICcgICAgICBhcmlhLWxhYmVsPVwie3tnZXRTb3J0RGlyZWN0aW9uQXJpYUxhYmVsKCl9fVwiPlxcbicgK1xuICAgICcgICAgICA8aVxcbicgK1xuICAgICcgICAgICAgbmctY2xhc3M9XCJ7IFxcJ3VpLWdyaWQtaWNvbi11cC1kaXJcXCc6IGNvbC5zb3J0LmRpcmVjdGlvbiA9PSBhc2MsIFxcJ3VpLWdyaWQtaWNvbi1kb3duLWRpclxcJzogY29sLnNvcnQuZGlyZWN0aW9uID09IGRlc2MsIFxcJ3VpLWdyaWQtaWNvbi1ibGFua1xcJzogIWNvbC5zb3J0LmRpcmVjdGlvbiB9XCJcXG4nICtcbiAgICAnICAgICAgIHRpdGxlPVwie3tpc1NvcnRQcmlvcml0eVZpc2libGUoKSA/IGkxOG4uaGVhZGVyQ2VsbC5wcmlvcml0eSArIFxcJyBcXCcgKyAoIGNvbC5zb3J0LnByaW9yaXR5ICsgMSApICA6IG51bGx9fVwiXFxuJyArXG4gICAgJyAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIj5cXG4nICtcbiAgICAnICAgICA8L2k+XFxuJyArXG4gICAgJyAgICAgPHN1YlxcbicgK1xuICAgICcgICAgICAgdWktZ3JpZC12aXNpYmxlPVwiaXNTb3J0UHJpb3JpdHlWaXNpYmxlKClcIlxcbicgK1xuICAgICcgICAgICAgY2xhc3M9XCJ1aS1ncmlkLXNvcnQtcHJpb3JpdHktbnVtYmVyXCI+XFxuJyArXG4gICAgJyAgICAgICB7e2NvbC5zb3J0LnByaW9yaXR5ICsgMX19XFxuJyArXG4gICAgJyAgICAgPC9zdWI+XFxuJyArXG4gICAgJyAgICA8L3NwYW4+XFxuJyArXG4gICAgJyAgPC9tZC1idXR0b24+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgIDxkaXYgdWktZ3JpZC1maWx0ZXI+PC9kaXY+XFxuJyArXG4gICAgJzwvZGl2PicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy91aUdyaWRIZWFkZXJDZWxsLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRhdGUuaHRtbCcsXG4gICAgJzxkaXYgbGF5b3V0PVwicm93XCIgbGF5b3V0LWFsaWduPVwiY2VudGVyIGNlbnRlclwiPlxcbicgK1xuICAgICcgICAgPGxhYmVsIG5nLWJpbmQ9XCJmaWx0ZXIuY29sdW1uLmRpc3BsYXlOYW1lXCI+PC9sYWJlbD5cXG4nICtcbiAgICAnICAgIDxtZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICAgICAgPGxhYmVsPnt7XFwndC5Gcm9tXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L2xhYmVsPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1kYXRlcGlja2VyIG5nLW1vZGVsPVwiZmlsdGVyLmZyb21cIiBuZy1jaGFuZ2U9XCJmaWx0ZXIudG8gPSBmaWx0ZXIuZnJvbSAmJiBmaWx0ZXIudG8gJiYgZmlsdGVyLnRvIDwgZmlsdGVyLmZyb20gPyBmaWx0ZXIuZnJvbSA6IGZpbHRlci50b1wiPjwvbWQtZGF0ZXBpY2tlcj5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgPG1kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgICAgICA8bGFiZWw+e3tcXCd0LlRvXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L2xhYmVsPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1kYXRlcGlja2VyIG5nLW1vZGVsPVwiZmlsdGVyLnRvXCIgbmctY2hhbmdlPVwiZmlsdGVyLmZyb20gPSBmaWx0ZXIuZnJvbSAmJiBmaWx0ZXIudG8gJiYgZmlsdGVyLmZyb20gPiBmaWx0ZXIudG8gPyBmaWx0ZXIudG8gOiBmaWx0ZXIuZnJvbVwiPjwvbWQtZGF0ZXBpY2tlcj5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kYXRlLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sJyxcbiAgICAnPG1kLWRpYWxvZyBjbGFzcz1cInhwLWdyaWRmaWx0ZXJcIiBhcmlhLWxhYmVsPVwiR3JpZEZpbHRlclwiIGxheW91dC1wYWRkaW5nPlxcbicgK1xuICAgICcgICAgPGRpdiBjbGFzcz1cImRpYWxvZ0hlYWRlclwiIGZsZXg9XCJhdXRvXCI+XFxuJyArXG4gICAgJyAgICAgICAgPHNwYW4+e3tcXCd0LkZpbHRlcnNcXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGUgfX08L3NwYW4+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgICAgICAgIDx4cC1hdXRvY29tcGxldGVcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtZmxvYXRpbmctbGFiZWw9XCJ7eyBcXCd0LkNob29zZUFDb2x1bW5cXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGUgfX1cIlxcbicgK1xuICAgICcgICAgICAgICAgICB4cC1pdGVtcz1cImNvbHVtbnNcIlxcbicgK1xuICAgICcgICAgICAgICAgICB4cC1pdGVtLXRleHQ9XCJpdGVtLmRpc3BsYXlOYW1lXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtc2VhcmNoLXRleHQ9XCJhdXRvQ29tcGxldGVUZXh0XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtc2VsZWN0ZWQtaXRlbT1cInNlbGVjdGVkQ29sdW1uXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtc2VsZWN0ZWQtaXRlbS1jaGFuZ2U9XCJzZWxlY3RlZENvbHVtbkNoYW5nZWQoaXRlbSlcIi8+XFxuJyArXG4gICAgJyAgICA8L2Rpdj5cXG4nICtcbiAgICAnXFxuJyArXG4gICAgJyAgICA8bWQtZGlhbG9nLWNvbnRlbnQgZmxleD1cIjEwMFwiPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1saXN0PlxcbicgK1xuICAgICcgICAgICAgICAgICA8bWQtbGlzdC1pdGVtIGNsYXNzPVwic2Vjb25kYXJ5LWJ1dHRvbi1wYWRkaW5nIHhwLWdyaWRmaWx0ZXItaXRlbVwiIG5nLXJlcGVhdD1cImZpbHRlciBpbiBmaWx0ZXJzXCI+XFxuJyArXG4gICAgJyAgICAgICAgICAgICAgICA8bmctaW5jbHVkZSBmbGV4PVwiYXV0b1wiIHNyYz1cIlxcJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1cXCcgKyAoZmlsdGVyLmNvbHVtbi5jb2x1bW5EZWYuZmlsdGVyVHlwZSB8fCBcXCdzdHJpbmdcXCcpICsgXFwnLmh0bWxcXCdcIj48L25nLWluY2x1ZGU+XFxuJyArXG4gICAgJyAgICAgICAgICAgICAgICA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJSZW1vdmVGaWx0ZXJcIiBjbGFzcz1cIm1kLXNlY29uZGFyeVwiIG5nLWNsaWNrPVwicmVtb3ZlRmlsdGVyKGZpbHRlcilcIj48bmctbWQtaWNvbiBpY29uPVwiZGVsZXRlXCI+PC9uZy1tZC1pY29uPjwvbWQtYnV0dG9uPlxcbicgK1xuICAgICcgICAgICAgICAgICA8L21kLWxpc3QtaXRlbT5cXG4nICtcbiAgICAnICAgICAgICA8L21kLWxpc3Q+XFxuJyArXG4gICAgJyAgICA8L21kLWRpYWxvZy1jb250ZW50PlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICAgIDxtZC1kaWFsb2ctYWN0aW9ucyBmbGV4PVwiYXV0b1wiPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIkRlbGV0ZUFsbFwiIG5nLWNsaWNrPVwiZmlsdGVycyA9IFtdXCIgbmctZGlzYWJsZWQ9XCIhZmlsdGVycy5sZW5ndGhcIj57e1xcJ3QuRGVsZXRlQWxsXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnICAgICAgICA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJDYW5jZWxcIiBuZy1jbGljaz1cImNhbmNlbCgpXCI+e3tcXCd0LkNhbmNlbFxcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9tZC1idXR0b24+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWJ1dHRvbiBhcmlhLWxhYmVsPVwiQXBwbHlcIiBuZy1jbGljaz1cImFwcGx5KGZpbHRlcnMpXCI+e3tcXCd0LkFwcGx5XFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnICAgIDwvbWQtZGlhbG9nLWFjdGlvbnM+XFxuJyArXG4gICAgJzwvbWQtZGlhbG9nPicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbCcsXG4gICAgJzxkaXYgbGF5b3V0PVwicm93XCIgbGF5b3V0LWFsaWduPVwiY2VudGVyIGNlbnRlclwiPlxcbicgK1xuICAgICcgICAgPGxhYmVsIG5nLWJpbmQ9XCJmaWx0ZXIuY29sdW1uLmRpc3BsYXlOYW1lXCI+PC9sYWJlbD5cXG4nICtcbiAgICAnICAgIDxtZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICAgICAgPGxhYmVsPnt7XFwndC5Gcm9tXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L2xhYmVsPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1pbnB1dCBuZy1tb2RlbD1cImZpbHRlci5mcm9tXCI+PC9tZC1pbnB1dD5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgPG1kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgICAgICA8bGFiZWw+e3tcXCd0LlRvXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L2xhYmVsPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1pbnB1dCBuZy1tb2RlbD1cImZpbHRlci50b1wiPjwvbWQtaW5wdXQ+XFxuJyArXG4gICAgJyAgICA8L21kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItbnVtYmVyLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sJyxcbiAgICAnPG1kLWlucHV0LWNvbnRhaW5lciBjbGFzcz1cIm1kLWJsb2NrXCI+XFxuJyArXG4gICAgJyAgPGxhYmVsIG5nLWJpbmQ9XCJmaWx0ZXIuY29sdW1uLmRpc3BsYXlOYW1lXCI+PC9sYWJlbD5cXG4nICtcbiAgICAnICA8aW5wdXQgdHlwZT1cInRleHRcIiBuZy1tb2RlbD1cImZpbHRlci52YWx1ZVwiIHJlcXVpcmVkPlxcbicgK1xuICAgICc8L21kLWlucHV0LWNvbnRhaW5lcj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1zdHJpbmcuaHRtbFwiOyIsIlJ4Lk9ic2VydmFibGUucHJvdG90eXBlLiRhcHBseSA9IGZ1bmN0aW9uIChzY29wZSwgdGhpc0FyZykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgcmV0dXJuIG5ldyBSeC5Bbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvYnNlcnZlcikge1xyXG4gICAgICAgIHJldHVybiBzZWxmLnN1YnNjcmliZShcclxuICAgICAgICAgICAgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7IG9ic2VydmVyLm9uTmV4dChlKTsgfSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IuYmluZChvYnNlcnZlciksXHJcbiAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXHJcbiAgICAgICAgKTtcclxuICAgIH0pO1xyXG59OyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbJ25nTWF0ZXJpYWwnLCAnbmdNZEljb25zJywgJ3VpLmdyaWQnLCAndWkuZ3JpZC5yZXNpemVDb2x1bW5zJywgJ3VpLmdyaWQubW92ZUNvbHVtbnMnLCAndWkuZ3JpZC5pbmZpbml0ZVNjcm9sbCddKVxyXG5cclxuICAgIC8vIGRpcmVjdGl2ZXNcclxuICAgIC5kaXJlY3RpdmUoJ3hwQXV0b2NvbXBsZXRlJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3hwLWF1dG9jb21wbGV0ZScpKVxyXG4gICAgLmRpcmVjdGl2ZSgneHBHcmlkJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3hwLWdyaWQnKSlcclxuICAgIC5kaXJlY3RpdmUoJ3hwR3JpZGZpbHRlckJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy94cC1ncmlkZmlsdGVyLWJ1dHRvbicpKVxyXG5cclxuICAgIC8vIGZpbHRlcnNcclxuICAgIC5maWx0ZXIoJ3hwQ29tcG9uZW50c1RyYW5zbGF0ZScsIHJlcXVpcmUoJy4vZmlsdGVycy94cENvbXBvbmVudHNUcmFuc2xhdGUnKSlcclxuXHJcbiAgICAvLyBzZXJ2aWNlcyAgXHJcbiAgICAuZmFjdG9yeSgneHBHcmlkZmlsdGVyRGlhbG9nJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy94cEdyaWRmaWx0ZXJEaWFsb2cnKSlcclxuICAgIC5mYWN0b3J5KCd4cEdyaWRTZXJ2aWNlJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy94cEdyaWRTZXJ2aWNlJykpXHJcbiAgICAuZmFjdG9yeSgneHBDb21wb25lbnRzVHJhbnNsYXRlU2VydmljZScsIHJlcXVpcmUoJy4vc2VydmljZXMveHBDb21wb25lbnRzVHJhbnNsYXRlU2VydmljZScpKVxyXG5cclxuICAgIC8vIHRlbXBsYXRlc1xyXG4gICAgLnJ1bihyZXF1aXJlKCcuL3RlbXBsYXRlcycpKTtcclxuXHJcbnJlcXVpcmUoJy4vdXRpbHMvcngnKTtcclxuIl19
