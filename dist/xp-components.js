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

module.exports = ['$q', function ($q) {
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
                var result = options.fetch(params);

                if (!result.subscribe) result = Rx.Observable.fromPromise($q.when(result));

                return result.catch(function (_) {
                    return Rx.Observable.empty();
                });
            }).$apply(scope).tap(function (data) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGRpcmVjdGl2ZXNcXHhwLWF1dG9jb21wbGV0ZS5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZC5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZGZpbHRlci1idXR0b24uanMiLCJzcmNcXGZpbHRlcnNcXHhwQ29tcG9uZW50c1RyYW5zbGF0ZS5qcyIsInNyY1xcc2VydmljZXNcXHhwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UuanMiLCJzcmNcXHNlcnZpY2VzXFx4cEdyaWRTZXJ2aWNlLmpzIiwic3JjXFxzZXJ2aWNlc1xceHBHcmlkZmlsdGVyRGlhbG9nLmpzIiwic3JjXFx0ZW1wbGF0ZXNcXGluZGV4LmpzIiwic3JjL3RlbXBsYXRlcy91aS1ncmlkLWhlYWRlci5odG1sIiwic3JjL3RlbXBsYXRlcy91aS1ncmlkLXJvdy5odG1sIiwic3JjL3RlbXBsYXRlcy91aUdyaWRIZWFkZXJDZWxsLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGF0ZS5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLW51bWJlci5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sIiwic3JjXFx1dGlsc1xccnguanMiLCJzcmNcXGxpYi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUEsU0FBUyxnQkFBVCxDQUEwQixDQUExQixFQUE2QjtBQUN6QixXQUFPLENBQUMsS0FBSyxFQUFOLEVBQVUsV0FBVixFQUFQO0FBQ0g7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLENBQUMsUUFBRCxFQUFXLFVBQVUsTUFBVixFQUFrQjtBQUMxQyxXQUFPO0FBQ0gsa0JBQVUsR0FEUDtBQUVILGVBQU87QUFDSCxx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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2ZBLEdBQUcsVUFBSCxDQUFjLFNBQWQsQ0FBd0IsTUFBeEIsR0FBaUMsVUFBVSxLQUFWLEVBQWlCLE9BQWpCLEVBQTBCO0FBQ3ZELFFBQUksT0FBTyxJQUFYO0FBQ0EsV0FBTyxJQUFJLEdBQUcsbUJBQVAsQ0FBMkIsVUFBVSxRQUFWLEVBQW9CO0FBQ2xELGVBQU8sS0FBSyxTQUFMLENBQ0gsVUFBVSxDQUFWLEVBQWE7QUFDVCxrQkFBTSxNQUFOLENBQWEsWUFBWTtBQUFFLHlCQUFTLE1BQVQsQ0FBZ0IsQ0FBaEI7QUFBcUIsYUFBaEQ7QUFDSCxTQUhFLEVBSUgsU0FBUyxPQUFULENBQWlCLElBQWpCLENBQXNCLFFBQXRCLENBSkcsRUFLSCxTQUFTLFdBQVQsQ0FBcUIsSUFBckIsQ0FBMEIsUUFBMUIsQ0FMRyxDQUFQO0FBT0gsS0FSTSxDQUFQO0FBU0gsQ0FYRDs7Ozs7QUNBQSxRQUNLLE1BREwsQ0FDWSxlQURaLEVBQzZCLENBQUMsWUFBRCxFQUFlLFdBQWYsRUFBNEIsU0FBNUIsRUFBdUMsdUJBQXZDLEVBQWdFLHFCQUFoRSxFQUF1Rix3QkFBdkYsQ0FEN0I7O0FBR0k7QUFISixDQUlLLFNBSkwsQ0FJZSxnQkFKZixFQUlpQyxRQUFRLDhCQUFSLENBSmpDLEVBS0ssU0FMTCxDQUtlLFFBTGYsRUFLeUIsUUFBUSxzQkFBUixDQUx6QixFQU1LLFNBTkwsQ0FNZSxvQkFOZixFQU1xQyxRQUFRLG1DQUFSLENBTnJDOztBQVFJO0FBUkosQ0FTSyxNQVRMLENBU1ksdUJBVFosRUFTcUMsUUFBUSxpQ0FBUixDQVRyQzs7QUFXSTtBQVhKLENBWUssT0FaTCxDQVlhLG9CQVpiLEVBWW1DLFFBQVEsK0JBQVIsQ0FabkMsRUFhSyxPQWJMLENBYWEsZUFiYixFQWE4QixRQUFRLDBCQUFSLENBYjlCLEVBY0ssT0FkTCxDQWNhLDhCQWRiLEVBYzZDLFFBQVEseUNBQVIsQ0FkN0M7O0FBZ0JJO0FBaEJKLENBaUJLLEdBakJMLENBaUJTLFFBQVEsYUFBUixDQWpCVDs7QUFtQkEsUUFBUSxZQUFSIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIHNlYXJjaGFibGVTdHJpbmcoYSkge1xyXG4gICAgcmV0dXJuIChhIHx8ICcnKS50b0xvd2VyQ2FzZSgpOyAgICAgICAgXHJcbn1cclxuXHJcbi8vLyBleGFtcGxlXHJcbi8vL1xyXG4vLy8gICAgIDx4cC1hdXRvY29tcGxldGUgeHAtaXRlbXM9XCJpdGVtIGluIGl0ZW1zXCIgeHAtaXRlbS10ZXh0PVwiaXRlbS5kaXNwbGF5XCI+PC94cC1hdXRvY29tcGxldGU+XHJcbi8vL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBbJyRwYXJzZScsIGZ1bmN0aW9uICgkcGFyc2UpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICB4cEl0ZW1zOiAnPT8nLFxyXG4gICAgICAgICAgICB4cFNlYXJjaFRleHQ6ICc9PycsXHJcbiAgICAgICAgICAgIHhwU2VsZWN0ZWRJdGVtOiAnPT8nLFxyXG4gICAgICAgICAgICB4cEZsb2F0aW5nTGFiZWw6ICdAJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGU6IGZ1bmN0aW9uIChlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICByZXR1cm4gYDxtZC1hdXRvY29tcGxldGVcclxuICAgICAgICAgICAgICAgIG1kLWl0ZW1zPVwiaXRlbSBpbiBfaXRlbXNcIlxyXG4gICAgICAgICAgICAgICAgbWQtaXRlbS10ZXh0PVwiJHthdHRycy54cEl0ZW1UZXh0fVwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWFyY2gtdGV4dD1cInhwU2VhcmNoVGV4dFwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWFyY2gtdGV4dC1jaGFuZ2U9XCIke2F0dHJzLnhwU2VhcmNoVGV4dENoYW5nZX1cIlxyXG4gICAgICAgICAgICAgICAgbWQtc2VsZWN0ZWQtaXRlbT1cInhwU2VsZWN0ZWRJdGVtXCJcclxuICAgICAgICAgICAgICAgIG1kLXNlbGVjdGVkLWl0ZW0tY2hhbmdlPVwic2VsZWN0ZWRJdGVtQ2hhbmdlKHhwU2VsZWN0ZWRJdGVtKVwiXHJcbiAgICAgICAgICAgICAgICBtZC1taW4tbGVuZ3RoPVwiMFwiXHJcbiAgICAgICAgICAgICAgICBtZC1hdXRvc2VsZWN0PVwidHJ1ZVwiXHJcbiAgICAgICAgICAgICAgICBtZC1tYXRjaC1jYXNlLWluc2Vuc2l0aXZlPVwidHJ1ZVwiXHJcbiAgICAgICAgICAgICAgICBtZC1mbG9hdGluZy1sYWJlbD1cInt7eHBGbG9hdGluZ0xhYmVsfX1cIj5cclxuICAgICAgICAgICAgICAgICAgICA8bWQtaXRlbS10ZW1wbGF0ZT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gbWQtaGlnaGxpZ2h0LXRleHQ9XCJ4cFNlYXJjaFRleHRcIiBtZC1oaWdobGlnaHQtZmxhZ3M9XCJpXCI+e3ske2F0dHJzLnhwSXRlbVRleHR9fX08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9tZC1pdGVtLXRlbXBsYXRlPlxyXG4gICAgICAgICAgICA8L21kLWF1dG9jb21wbGV0ZT5gO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICB2YXIgZ2V0SXRlbVRleHQgPSAkcGFyc2UoYXR0cnMueHBJdGVtVGV4dCk7XHJcbiAgICAgICAgICAgIHZhciBpdGVtcztcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLl9pdGVtcyA9IFtdO1xyXG4gICAgICAgICAgICBzY29wZS5fc2VhcmNoX3RleHQgPSAnJztcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkSXRlbUNoYW5nZSA9IGl0ZW0gPT4gc2NvcGUuJHBhcmVudC4kZXZhbChhdHRycy54cFNlbGVjdGVkSXRlbUNoYW5nZSwgeyBpdGVtIH0pO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGBbeHBJdGVtcyx4cFNlYXJjaFRleHRdYCwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpdGVtcyA9IGVbMF0gfHwgW107XHJcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGVbMV0gfHwgJyc7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXJyYXkgPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICB0ZXh0ID0gc2VhcmNoYWJsZVN0cmluZyh0ZXh0KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGV4dCB8fCBzZWFyY2hhYmxlU3RyaW5nKGdldEl0ZW1UZXh0KHNjb3BlLCB7IGl0ZW06IGl0ZW1zW2ldIH0pKS5pbmRleE9mKHRleHQpICE9PSAtMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyYXkucHVzaChpdGVtc1tpXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuX2l0ZW1zID0gYXJyYXk7XHJcblxyXG4gICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XTsiLCJtb2R1bGUuZXhwb3J0cyA9IFsnJHEnLCBmdW5jdGlvbiAoJHEpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZTogdHJ1ZSxcclxuICAgICAgICB0ZW1wbGF0ZTogYDxkaXYgbGF5b3V0PVwiY29sdW1uXCIgY2xhc3M9XCJ4cC1ncmlkXCI+XHJcbiAgICAgICAgICAgIDx4cC1ncmlkZmlsdGVyLWJ1dHRvbiB4cC1ncmlkLW9wdGlvbnM9XCJvcHRpb25zXCIgbGF5b3V0PVwicm93XCIgbGF5b3V0LWFsaWduPVwiZW5kIGNlbnRlclwiPjwveHAtZ3JpZGZpbHRlci1idXR0b24+XHJcbiAgICAgICAgICAgIDxkaXYgdWktZ3JpZD1cIm9wdGlvbnNcIiBmbGV4IHVpLWdyaWQtcmVzaXplLWNvbHVtbnMgdWktZ3JpZC1tb3ZlLWNvbHVtbnMgdWktZ3JpZC1pbmZpbml0ZS1zY3JvbGw+PC9kaXY+XHJcbiAgICAgICAgPC9kaXY+YCxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgc29ydDtcclxuICAgICAgICAgICAgdmFyIG11c3RSZWxvYWQ7XHJcbiAgICAgICAgICAgIHZhciBwYWdlID0gMDtcclxuICAgICAgICAgICAgdmFyIHJlZnJlc2ggPSBuZXcgUnguU3ViamVjdCgpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUub3B0aW9ucyA9IHNjb3BlLiRwYXJlbnQuJGV2YWwoYXR0cnMueHBHcmlkT3B0aW9ucyB8fCAne30nKSB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0gYW5ndWxhci5leHRlbmQoc2NvcGUub3B0aW9ucywge1xyXG4gICAgICAgICAgICAgICAgZGF0YTogW10sXHJcbiAgICAgICAgICAgICAgICBpbmZpbml0ZVNjcm9sbFJvd3NGcm9tRW5kOiAxMDAsXHJcbiAgICAgICAgICAgICAgICBpbmZpbml0ZVNjcm9sbERvd246IHRydWUsXHJcbiAgICAgICAgICAgICAgICBvblJlZ2lzdGVyQXBpOiBmdW5jdGlvbiAoZ3JpZEFwaSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLm9wdGlvbnMuZ3JpZEFwaSA9IGdyaWRBcGk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZEFwaS5jb3JlLm9uLnNvcnRDaGFuZ2VkKHNjb3BlLCBzb3J0Q2hhbmdlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc29ydENoYW5nZWQoZ3JpZEFwaS5ncmlkLCBbb3B0aW9ucy5jb2x1bW5EZWZzWzFdXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZEFwaS5pbmZpbml0ZVNjcm9sbC5vbi5uZWVkTG9hZE1vcmVEYXRhKHNjb3BlLCBuZWVkTG9hZE1vcmVEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBvcHRpb25zLnJlZnJlc2ggPSBfID0+IHJlZnJlc2gub25OZXh0KHRydWUpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKCdvcHRpb25zLmNvbHVtbkRlZnMnLCBjb2x1bW5zID0+IHNjb3BlLmZpbHRlcnMgPSBjb21wdXRlRmlsdGVycyhjb2x1bW5zKSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHNjb3BlLiR3YXRjaCgnZmlsdGVycycsIF8gPT4gcmVmcmVzaC5vbk5leHQodHJ1ZSksIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUucm93Q2xpY2sgPSBmdW5jdGlvbiByb3dDbGljayhlKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLnNlbGVjdGVkUm93ID0gZS5yb3c7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMucm93Q2xpY2spXHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5yb3dDbGljayhlKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIG5lZWRMb2FkTW9yZURhdGEoKSB7XHJcbiAgICAgICAgICAgICAgICByZWZyZXNoLm9uTmV4dChmYWxzZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHNvcnRDaGFuZ2VkKGdyaWQsIHNvcnRDb2x1bW5zKSB7XHJcbiAgICAgICAgICAgICAgICBzb3J0ID0gY29tcHV0ZVNvcnRTdHJpbmcoc29ydENvbHVtbnMpO1xyXG4gICAgICAgICAgICAgICAgcmVmcmVzaC5vbk5leHQodHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlZnJlc2hcclxuICAgICAgICAgICAgICAgIC5tYXAoZSA9PiBtdXN0UmVsb2FkIHw9IGUpXHJcbiAgICAgICAgICAgICAgICAuZGVib3VuY2UoMSlcclxuICAgICAgICAgICAgICAgIC4kYXBwbHkoc2NvcGUpXHJcbiAgICAgICAgICAgICAgICAuZmxhdE1hcExhdGVzdChmdW5jdGlvbiAocmVsb2FkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbXVzdFJlbG9hZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVsb2FkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2UgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5zZWxlY3RlZFJvdyA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gYW5ndWxhci5leHRlbmQoeyBwYWdlLCBzb3J0LCBwYWdlU2l6ZTogMTAwIH0sIHNjb3BlLmZpbHRlcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBvcHRpb25zLmZldGNoKHBhcmFtcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LnN1YnNjcmliZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gUnguT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZSgkcS53aGVuKHJlc3VsdCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LmNhdGNoKF8gPT4gUnguT2JzZXJ2YWJsZS5lbXB0eSgpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuJGFwcGx5KHNjb3BlKVxyXG4gICAgICAgICAgICAgICAgLnRhcChmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UrKztcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEgPSBvcHRpb25zLmRhdGEuY29uY2F0KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLm9wdGlvbnMuZ3JpZEFwaS5pbmZpbml0ZVNjcm9sbC5kYXRhTG9hZGVkKGZhbHNlLCBkYXRhLmxlbmd0aCA+PSAxMDApO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1dO1xyXG5cclxuZnVuY3Rpb24gY29tcHV0ZUZpbHRlcnMoY29sdW1ucykge1xyXG4gICAgdmFyIG8gPSB7fTtcclxuXHJcbiAgICBpZiAoY29sdW1ucylcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGNvbHVtbiA9IGNvbHVtbnNbaV07XHJcbiAgICAgICAgICAgIHZhciBmaWx0ZXJzID0gY29sdW1uLmZpbHRlcnMgfHwgW107XHJcblxyXG4gICAgICAgICAgICBpZiAoZmlsdGVycy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICBvW2NvbHVtbi5uYW1lXSA9IGZpbHRlcnM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIHJldHVybiBvO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb21wdXRlU29ydFN0cmluZyhzb3J0Q29sdW1ucykge1xyXG4gICAgdmFyIHMgPSAnJztcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvcnRDb2x1bW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHMpIHMgKz0gJywnO1xyXG5cclxuICAgICAgICB2YXIgY29sID0gc29ydENvbHVtbnNbaV07XHJcbiAgICAgICAgaWYgKGNvbC5zb3J0KVxyXG4gICAgICAgICAgICBzICs9IGNvbC5uYW1lICsgJzonICsgY29sLnNvcnQuZGlyZWN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSBbJ3hwR3JpZGZpbHRlckRpYWxvZycsICckcGFyc2UnLCBmdW5jdGlvbiAoeHBHcmlkZmlsdGVyRGlhbG9nLCBwYXJzZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzY29wZTogdHJ1ZSxcclxuICAgICAgICB0ZW1wbGF0ZTogYDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIkZpbHRlclwiIG5nLWNsaWNrPVwic2hvd0RpYWxvZygpXCIgbmctY2xhc3M9XCJ7J21kLXByaW1hcnknOiBmaWx0ZXJlZCgpfVwiPlxyXG4gICAgICAgICAgICA8bmctbWQtaWNvbiBpY29uPVwiZmlsdGVyX2xpc3RcIj48L25nLW1kLWljb24+XHJcbiAgICAgICAgPC9tZC1idXR0b24+YCxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0gcGFyc2UoYXR0cnMueHBHcmlkT3B0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5maWx0ZXJlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciB7IGNvbHVtbkRlZnMgfSA9IG9wdGlvbnMoc2NvcGUpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICBpZiAoY29sdW1uRGVmcylcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbkRlZnMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW5EZWZzW2ldLmZpbHRlcnMgJiYgY29sdW1uRGVmc1tpXS5maWx0ZXJzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuc2hvd0RpYWxvZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBncmlkT3B0aW9ucyA9IG9wdGlvbnMoc2NvcGUpIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgeHBHcmlkZmlsdGVyRGlhbG9nKHsgZ3JpZE9wdGlvbnMgfSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufV07IiwibW9kdWxlLmV4cG9ydHMgPSBbJ3hwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UnLCBmdW5jdGlvbiAoc2VydmljZSkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHhwQ29tcG9uZW50c1RyYW5zbGF0ZSh2YWx1ZSkge1xyXG4gICAgICAgIHJldHVybiBzZXJ2aWNlKHZhbHVlLnN1YnN0cmluZygyKSkgfHwgdmFsdWU7XHJcbiAgICB9O1xyXG59XTsiLCJtb2R1bGUuZXhwb3J0cyA9IFtmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgdmFyIGN1cnJlbnQgPSAnZW4nO1xyXG5cclxuICAgIHZhciBmID0gZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgIHJldHVybiBmLmxvY2FsZXNbY3VycmVudF1ba2V5XTtcclxuICAgIH1cclxuXHJcbiAgICBmLmxhbmcgPSBmdW5jdGlvbiAobGFuZykge1xyXG4gICAgICAgIGlmICghbGFuZykgcmV0dXJuIGN1cnJlbnQ7XHJcbiAgICAgICAgY3VycmVudCA9IGxhbmc7XHJcbiAgICB9O1xyXG5cclxuICAgIGYubG9jYWxlcyA9IHtcclxuICAgICAgICBlbjoge1xyXG4gICAgICAgICAgICBBcHBseTogJ0FwcGx5JyxcclxuICAgICAgICAgICAgQ2FuY2VsOiAnQ2FuY2VsJyxcclxuICAgICAgICAgICAgQ2hvb3NlQUNvbHVtbjogJ0Nob29zZSBhIGNvbHVtbicsXHJcbiAgICAgICAgICAgIERlbGV0ZUFsbDogJ0RlbGV0ZSBBbGwnLFxyXG4gICAgICAgICAgICBGaWx0ZXJzOiAnRmlsdGVycycsXHJcbiAgICAgICAgICAgIEZyb206ICdGcm9tJyxcclxuICAgICAgICAgICAgVG86ICdUbydcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZyOiB7XHJcbiAgICAgICAgICAgIEFwcGx5OiAnQXBwbGlxdWVyJyxcclxuICAgICAgICAgICAgQ2FuY2VsOiAnQW5udWxlcicsXHJcbiAgICAgICAgICAgIENob29zZUFDb2x1bW46ICdDaG9pc2lzc2V6IHVuZSBjb2xvbm5lJyxcclxuICAgICAgICAgICAgRGVsZXRlQWxsOiAnU3VwcHJpbWVyIHRvdXQnLFxyXG4gICAgICAgICAgICBGaWx0ZXJzOiAnRmlsdHJlcycsXHJcbiAgICAgICAgICAgIEZyb206ICdEZScsXHJcbiAgICAgICAgICAgIFRvOiAnw4AnXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gZjtcclxufV07IiwibW9kdWxlLmV4cG9ydHMgPSBbJyRmaWx0ZXInLCBmdW5jdGlvbiAoJGZpbHRlcikge1xyXG4gICAgY2xhc3MgWHBHcmlkU2VydmljZSB7XHJcbiAgICAgICAgZ2V0Q29sdW1uRGlzcGxheU5hbWUoY29sdW1uRGVmKSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBhbmd1bGFyLmlzVW5kZWZpbmVkKGNvbHVtbkRlZi5kaXNwbGF5TmFtZSkgPyBjb2x1bW5EZWYuZmllbGQgOiBjb2x1bW5EZWYuZGlzcGxheU5hbWU7XHJcblxyXG4gICAgICAgICAgICBpZiAoY29sdW1uRGVmLmhlYWRlckNlbGxGaWx0ZXIpXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSAkZmlsdGVyKGNvbHVtbkRlZi5oZWFkZXJDZWxsRmlsdGVyKShyZXN1bHQpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ldyBYcEdyaWRTZXJ2aWNlKCk7XHJcbn1dOyIsImZ1bmN0aW9uIGNvbHVtbnNDb21wYXJlcihhLCBiKSB7XHJcbiAgICByZXR1cm4gYS5kaXNwbGF5TmFtZSA8IGIuZGlzcGxheU5hbWUgPyAtMSA6IGEuZGlzcGxheU5hbWUgPiBiLmRpc3BsYXlOYW1lID8gMSA6IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRGaWx0ZXJzKGNvbHVtbnMpIHtcclxuICAgIHZhciByZXN1bHQgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgY29sdW1uID0gY29sdW1uc1tpXTtcclxuICAgICAgICB2YXIgZmlsdGVycyA9IGFuZ3VsYXIuY29weShjb2x1bW4uY29sdW1uRGVmLmZpbHRlcnMgfHwgW10pO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGZpbHRlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgdmFyIGZpbHRlciA9IGZpbHRlcnNbal07XHJcbiAgICAgICAgICAgIGZpbHRlci5jb2x1bW4gPSBjb2x1bW47XHJcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZpbHRlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNhdmVGaWx0ZXJzKGNvbHVtbnMsIGZpbHRlcnMpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1ucy5sZW5ndGg7IGkrKylcclxuICAgICAgICBjb2x1bW5zW2ldLmNvbHVtbkRlZi5maWx0ZXJzID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWx0ZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGZpbHRlciA9IGZpbHRlcnNbaV07XHJcbiAgICAgICAgZmlsdGVyLmNvbHVtbi5jb2x1bW5EZWYuZmlsdGVycy5wdXNoKGZpbHRlcik7XHJcbiAgICAgICAgZGVsZXRlIGZpbHRlci5jb2x1bW47XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gWyckbWREaWFsb2cnLCAnJHRpbWVvdXQnLCBmdW5jdGlvbiAoJG1kRGlhbG9nLCAkdGltZW91dCkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcbiAgICAgICAgdmFyIHsgZ3JpZE9wdGlvbnMgfSA9IG9wdGlvbnM7XHJcblxyXG4gICAgICAgIHZhciBkaWFsb2cgPSB7XHJcbiAgICAgICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcbiAgICAgICAgICAgIGNsaWNrT3V0c2lkZVRvQ2xvc2U6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRtZERpYWxvZycsICd4cEdyaWRTZXJ2aWNlJywgZnVuY3Rpb24gKHNjb3BlLCAkbWREaWFsb2csIHhwR3JpZFNlcnZpY2UpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5jb2x1bW5zID0gZ3JpZE9wdGlvbnNcclxuICAgICAgICAgICAgICAgICAgICAuY29sdW1uRGVmc1xyXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoY29sdW1uRGVmID0+ICh7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW5EZWYsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXlOYW1lOiB4cEdyaWRTZXJ2aWNlLmdldENvbHVtbkRpc3BsYXlOYW1lKGNvbHVtbkRlZilcclxuICAgICAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgICAgICAuc29ydChjb2x1bW5zQ29tcGFyZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmZpbHRlcnMgPSBsb2FkRmlsdGVycyhzY29wZS5jb2x1bW5zKTtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5hcHBseSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNhdmVGaWx0ZXJzKHNjb3BlLmNvbHVtbnMsIHNjb3BlLmZpbHRlcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgICRtZERpYWxvZy5oaWRlKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuY2FuY2VsID0gXyA9PiAkbWREaWFsb2cuY2FuY2VsKCk7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5hdXRvQ29tcGxldGVUZXh0ID0gJyc7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5zZWxlY3RlZENvbHVtbiA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUucmVtb3ZlRmlsdGVyID0gZnVuY3Rpb24gKGZpbHRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHNjb3BlLmZpbHRlcnMuaW5kZXhPZihmaWx0ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmZpbHRlcnMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gd2hlbiBhIGNvbHVtbiBpcyBzZWxlY3RlZCBpbiB0aGUgYXV0b2NvbXBsZXRlXHJcbiAgICAgICAgICAgICAgICBzY29wZS5zZWxlY3RlZENvbHVtbkNoYW5nZWQgPSBmdW5jdGlvbiAoc2VsZWN0ZWRDb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXNlbGVjdGVkQ29sdW1uKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBjb2x1bW5zIHRvIHRoZSBsaXN0IG9mIGZpbHRlcnMgZm9yIGVkaXRpbmcuXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsdGVycy51bnNoaWZ0KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBzZWxlY3RlZENvbHVtblxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNsZWFyIHRoZSBhdXRvY29tcGxldGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuYXV0b0NvbXBsZXRlVGV4dCA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5zZWxlY3RlZENvbHVtbiA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcueHAtZ3JpZGZpbHRlci1pdGVtIGlucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XSxcclxuICAgICAgICAgICAgZXNjYXBlVG9DbG9zZTogdHJ1ZSxcclxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGlhbG9nLmh0bWwnXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuICRtZERpYWxvZy5zaG93KGRpYWxvZyk7XHJcbiAgICB9O1xyXG59XTsiLCJyZXF1aXJlKCcuL3hwLWdyaWRmaWx0ZXItZGF0ZS5odG1sJyk7XHJcbnJlcXVpcmUoJy4veHAtZ3JpZGZpbHRlci1kaWFsb2cuaHRtbCcpO1xyXG5yZXF1aXJlKCcuL3hwLWdyaWRmaWx0ZXItbnVtYmVyLmh0bWwnKTtcclxucmVxdWlyZSgnLi94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sJyk7XHJcblxyXG52YXIgdWlHcmlkSGVhZGVyQ2VsbCA9IHJlcXVpcmUoJy4vdWlHcmlkSGVhZGVyQ2VsbC5odG1sJyk7XHJcbnZhciB1aUdyaWRSb3cgPSByZXF1aXJlKCcuL3VpLWdyaWQtcm93Lmh0bWwnKTtcclxudmFyIHVpR3JpZEhlYWRlciA9IHJlcXVpcmUoJy4vdWktZ3JpZC1oZWFkZXIuaHRtbCcpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHtcclxuICAgIC8vUmVwbGFjZSB1aS1ncmlkIHRlbXBsYXRlcyBcclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgndWktZ3JpZC91aUdyaWRIZWFkZXJDZWxsJywgJHRlbXBsYXRlQ2FjaGUuZ2V0KHVpR3JpZEhlYWRlckNlbGwpKTtcclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgndWktZ3JpZC91aS1ncmlkLXJvdycsICR0ZW1wbGF0ZUNhY2hlLmdldCh1aUdyaWRSb3cpKTtcclxuICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgndWktZ3JpZC91aS1ncmlkLWhlYWRlcicsICR0ZW1wbGF0ZUNhY2hlLmdldCh1aUdyaWRIZWFkZXIpKTtcclxufV07IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMvdWktZ3JpZC1oZWFkZXIuaHRtbCcsXG4gICAgJzxkaXZcXG4nICtcbiAgICAnICByb2xlPVwicm93Z3JvdXBcIlxcbicgK1xuICAgICcgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXJcIj4gPCEtLSB0aGVhZGVyIC0tPlxcbicgK1xuICAgICcgIDxkaXZcXG4nICtcbiAgICAnICAgIGNsYXNzPVwidWktZ3JpZC10b3AtcGFuZWxcIj5cXG4nICtcbiAgICAnICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci12aWV3cG9ydFwiPlxcbicgK1xuICAgICcgICAgICA8ZGl2XFxuJyArXG4gICAgJyAgICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jYW52YXNcIj5cXG4nICtcbiAgICAnICAgICAgICA8ZGl2XFxuJyArXG4gICAgJyAgICAgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNlbGwtd3JhcHBlclwiXFxuJyArXG4gICAgJyAgICAgICAgICBuZy1zdHlsZT1cImNvbENvbnRhaW5lci5oZWFkZXJDZWxsV3JhcHBlclN0eWxlKClcIj5cXG4nICtcbiAgICAnICAgICAgICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgICAgICAgcm9sZT1cInJvd1wiXFxuJyArXG4gICAgJyAgICAgICAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2VsbC1yb3dcIj5cXG4nICtcbiAgICAnICAgICAgICAgICAgPGRpdlxcbicgK1xuICAgICcgICAgICAgICAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2VsbCB1aS1ncmlkLWNsZWFyZml4XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgICBuZy1yZXBlYXQ9XCJjb2wgaW4gY29sQ29udGFpbmVyLnJlbmRlcmVkQ29sdW1ucyB0cmFjayBieSBjb2wudWlkXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgICB1aS1ncmlkLWhlYWRlci1jZWxsXFxuJyArXG4gICAgJyAgICAgICAgICAgICAgbWQtY29sb3JzPVwiOjp7YmFja2dyb3VuZDogXFwnYmFja2dyb3VuZFxcJ31cIlxcbicgK1xuICAgICcgICAgICAgICAgICAgIGNvbD1cImNvbFwiXFxuJyArXG4gICAgJyAgICAgICAgICAgICAgcmVuZGVyLWluZGV4PVwiJGluZGV4XCI+XFxuJyArXG4gICAgJyAgICAgICAgICAgIDwvZGl2PlxcbicgK1xuICAgICcgICAgICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICAgIDwvZGl2PlxcbicgK1xuICAgICcgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgPC9kaXY+XFxuJyArXG4gICAgJzwvZGl2PicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy91aS1ncmlkLWhlYWRlci5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMvdWktZ3JpZC1yb3cuaHRtbCcsXG4gICAgJzxkaXYgbmctcmVwZWF0PVwiKGNvbFJlbmRlckluZGV4LCBjb2wpIGluIGNvbENvbnRhaW5lci5yZW5kZXJlZENvbHVtbnMgdHJhY2sgYnkgY29sLnVpZFwiIHVpLWdyaWQtb25lLWJpbmQtaWQtZ3JpZD1cInJvd1JlbmRlckluZGV4ICsgXFwnLVxcJyArIGNvbC51aWQgKyBcXCctY2VsbFxcJ1wiXFxuJyArXG4gICAgJyAgICBjbGFzcz1cInVpLWdyaWQtY2VsbFwiIG5nLWNsYXNzPVwieyBcXCd1aS1ncmlkLXJvdy1oZWFkZXItY2VsbFxcJzogY29sLmlzUm93SGVhZGVyIH1cIiBtZC1jb2xvcnM9XCI6OntiYWNrZ3JvdW5kOiBcXCdiYWNrZ3JvdW5kLWh1ZS1cXCcgKyAocm93UmVuZGVySW5kZXggJSAyICsgMSl9XCIgcm9sZT1cInt7Y29sLmlzUm93SGVhZGVyID8gXFwncm93aGVhZGVyXFwnIDogXFwnZ3JpZGNlbGxcXCd9fVwiXFxuJyArXG4gICAgJyAgICB1aS1ncmlkLWNlbGwgbmctY2xpY2s9XCIkcGFyZW50LiRwYXJlbnQuJHBhcmVudC4kcGFyZW50LiRwYXJlbnQuJHBhcmVudC4kcGFyZW50LnJvd0NsaWNrKHsgZXZlbnQ6ICRldmVudCwgcm93OiByb3csIGNvbDogY29sIH0pXCI+XFxuJyArXG4gICAgJzwvZGl2PicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy91aS1ncmlkLXJvdy5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMvdWlHcmlkSGVhZGVyQ2VsbC5odG1sJyxcbiAgICAnPGRpdlxcbicgK1xuICAgICcgIHJvbGU9XCJjb2x1bW5oZWFkZXJcIlxcbicgK1xuICAgICcgIG5nLWNsYXNzPVwieyBcXCdzb3J0YWJsZVxcJzogc29ydGFibGUgfVwiXFxuJyArXG4gICAgJyAgdWktZ3JpZC1vbmUtYmluZC1hcmlhLWxhYmVsbGVkYnktZ3JpZD1cImNvbC51aWQgKyBcXCctaGVhZGVyLXRleHQgXFwnICsgY29sLnVpZCArIFxcJy1zb3J0ZGlyLXRleHRcXCdcIlxcbicgK1xuICAgICcgIGFyaWEtc29ydD1cInt7Y29sLnNvcnQuZGlyZWN0aW9uID09IGFzYyA/IFxcJ2FzY2VuZGluZ1xcJyA6ICggY29sLnNvcnQuZGlyZWN0aW9uID09IGRlc2MgPyBcXCdkZXNjZW5kaW5nXFwnIDogKCFjb2wuc29ydC5kaXJlY3Rpb24gPyBcXCdub25lXFwnIDogXFwnb3RoZXJcXCcpKX19XCI+XFxuJyArXG4gICAgJyAgPG1kLWJ1dHRvblxcbicgK1xuICAgICcgICAgcm9sZT1cImJ1dHRvblwiXFxuJyArXG4gICAgJyAgICB0YWJpbmRleD1cIjBcIlxcbicgK1xuICAgICcgICAgY2xhc3M9XCJ1aS1ncmlkLWNlbGwtY29udGVudHMgdWktZ3JpZC1oZWFkZXItY2VsbC1wcmltYXJ5LWZvY3VzXCJcXG4nICtcbiAgICAnICAgIGNvbC1pbmRleD1cInJlbmRlckluZGV4XCJcXG4nICtcbiAgICAnICAgIHRpdGxlPVwiVE9PTFRJUFwiPlxcbicgK1xuICAgICcgICAgPHNwYW5cXG4nICtcbiAgICAnICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jZWxsLWxhYmVsXCJcXG4nICtcbiAgICAnICAgICAgdWktZ3JpZC1vbmUtYmluZC1pZC1ncmlkPVwiY29sLnVpZCArIFxcJy1oZWFkZXItdGV4dFxcJ1wiPlxcbicgK1xuICAgICcgICAgICB7eyBjb2wuZGlzcGxheU5hbWUgQ1VTVE9NX0ZJTFRFUlMgfX1cXG4nICtcbiAgICAnICAgIDwvc3Bhbj5cXG4nICtcbiAgICAnXFxuJyArXG4gICAgJyAgICA8c3BhblxcbicgK1xuICAgICcgICAgICB1aS1ncmlkLW9uZS1iaW5kLWlkLWdyaWQ9XCJjb2wudWlkICsgXFwnLXNvcnRkaXItdGV4dFxcJ1wiXFxuJyArXG4gICAgJyAgICAgIHVpLWdyaWQtdmlzaWJsZT1cImNvbC5zb3J0LmRpcmVjdGlvblwiXFxuJyArXG4gICAgJyAgICAgIGFyaWEtbGFiZWw9XCJ7e2dldFNvcnREaXJlY3Rpb25BcmlhTGFiZWwoKX19XCI+XFxuJyArXG4gICAgJyAgICAgIDxpXFxuJyArXG4gICAgJyAgICAgICBuZy1jbGFzcz1cInsgXFwndWktZ3JpZC1pY29uLXVwLWRpclxcJzogY29sLnNvcnQuZGlyZWN0aW9uID09IGFzYywgXFwndWktZ3JpZC1pY29uLWRvd24tZGlyXFwnOiBjb2wuc29ydC5kaXJlY3Rpb24gPT0gZGVzYywgXFwndWktZ3JpZC1pY29uLWJsYW5rXFwnOiAhY29sLnNvcnQuZGlyZWN0aW9uIH1cIlxcbicgK1xuICAgICcgICAgICAgdGl0bGU9XCJ7e2lzU29ydFByaW9yaXR5VmlzaWJsZSgpID8gaTE4bi5oZWFkZXJDZWxsLnByaW9yaXR5ICsgXFwnIFxcJyArICggY29sLnNvcnQucHJpb3JpdHkgKyAxICkgIDogbnVsbH19XCJcXG4nICtcbiAgICAnICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxcbicgK1xuICAgICcgICAgIDwvaT5cXG4nICtcbiAgICAnICAgICA8c3ViXFxuJyArXG4gICAgJyAgICAgICB1aS1ncmlkLXZpc2libGU9XCJpc1NvcnRQcmlvcml0eVZpc2libGUoKVwiXFxuJyArXG4gICAgJyAgICAgICBjbGFzcz1cInVpLWdyaWQtc29ydC1wcmlvcml0eS1udW1iZXJcIj5cXG4nICtcbiAgICAnICAgICAgIHt7Y29sLnNvcnQucHJpb3JpdHkgKyAxfX1cXG4nICtcbiAgICAnICAgICA8L3N1Yj5cXG4nICtcbiAgICAnICAgIDwvc3Bhbj5cXG4nICtcbiAgICAnICA8L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnXFxuJyArXG4gICAgJyAgPGRpdiB1aS1ncmlkLWZpbHRlcj48L2Rpdj5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3VpR3JpZEhlYWRlckNlbGwuaHRtbFwiOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGF0ZS5odG1sJyxcbiAgICAnPGRpdiBsYXlvdXQ9XCJyb3dcIiBsYXlvdXQtYWxpZ249XCJjZW50ZXIgY2VudGVyXCI+XFxuJyArXG4gICAgJyAgICA8bGFiZWwgbmctYmluZD1cImZpbHRlci5jb2x1bW4uZGlzcGxheU5hbWVcIj48L2xhYmVsPlxcbicgK1xuICAgICcgICAgPG1kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgICAgICA8bGFiZWw+e3tcXCd0LkZyb21cXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbGFiZWw+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWRhdGVwaWNrZXIgbmctbW9kZWw9XCJmaWx0ZXIuZnJvbVwiIG5nLWNoYW5nZT1cImZpbHRlci50byA9IGZpbHRlci5mcm9tICYmIGZpbHRlci50byAmJiBmaWx0ZXIudG8gPCBmaWx0ZXIuZnJvbSA/IGZpbHRlci5mcm9tIDogZmlsdGVyLnRvXCI+PC9tZC1kYXRlcGlja2VyPlxcbicgK1xuICAgICcgICAgPC9tZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICA8bWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgICAgIDxsYWJlbD57e1xcJ3QuVG9cXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbGFiZWw+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWRhdGVwaWNrZXIgbmctbW9kZWw9XCJmaWx0ZXIudG9cIiBuZy1jaGFuZ2U9XCJmaWx0ZXIuZnJvbSA9IGZpbHRlci5mcm9tICYmIGZpbHRlci50byAmJiBmaWx0ZXIuZnJvbSA+IGZpbHRlci50byA/IGZpbHRlci50byA6IGZpbHRlci5mcm9tXCI+PC9tZC1kYXRlcGlja2VyPlxcbicgK1xuICAgICcgICAgPC9tZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJzwvZGl2PicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRhdGUuaHRtbFwiOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGlhbG9nLmh0bWwnLFxuICAgICc8bWQtZGlhbG9nIGNsYXNzPVwieHAtZ3JpZGZpbHRlclwiIGFyaWEtbGFiZWw9XCJHcmlkRmlsdGVyXCIgbGF5b3V0LXBhZGRpbmc+XFxuJyArXG4gICAgJyAgICA8ZGl2IGNsYXNzPVwiZGlhbG9nSGVhZGVyXCIgZmxleD1cImF1dG9cIj5cXG4nICtcbiAgICAnICAgICAgICA8c3Bhbj57e1xcJ3QuRmlsdGVyc1xcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZSB9fTwvc3Bhbj5cXG4nICtcbiAgICAnXFxuJyArXG4gICAgJyAgICAgICAgPHhwLWF1dG9jb21wbGV0ZVxcbicgK1xuICAgICcgICAgICAgICAgICB4cC1mbG9hdGluZy1sYWJlbD1cInt7IFxcJ3QuQ2hvb3NlQUNvbHVtblxcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZSB9fVwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLWl0ZW1zPVwiY29sdW1uc1wiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLWl0ZW0tdGV4dD1cIml0ZW0uZGlzcGxheU5hbWVcIlxcbicgK1xuICAgICcgICAgICAgICAgICB4cC1zZWFyY2gtdGV4dD1cImF1dG9Db21wbGV0ZVRleHRcIlxcbicgK1xuICAgICcgICAgICAgICAgICB4cC1zZWxlY3RlZC1pdGVtPVwic2VsZWN0ZWRDb2x1bW5cIlxcbicgK1xuICAgICcgICAgICAgICAgICB4cC1zZWxlY3RlZC1pdGVtLWNoYW5nZT1cInNlbGVjdGVkQ29sdW1uQ2hhbmdlZChpdGVtKVwiLz5cXG4nICtcbiAgICAnICAgIDwvZGl2PlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICAgIDxtZC1kaWFsb2ctY29udGVudCBmbGV4PVwiMTAwXCI+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWxpc3Q+XFxuJyArXG4gICAgJyAgICAgICAgICAgIDxtZC1saXN0LWl0ZW0gY2xhc3M9XCJzZWNvbmRhcnktYnV0dG9uLXBhZGRpbmcgeHAtZ3JpZGZpbHRlci1pdGVtXCIgbmctcmVwZWF0PVwiZmlsdGVyIGluIGZpbHRlcnNcIj5cXG4nICtcbiAgICAnICAgICAgICAgICAgICAgIDxuZy1pbmNsdWRlIGZsZXg9XCJhdXRvXCIgc3JjPVwiXFwnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLVxcJyArIChmaWx0ZXIuY29sdW1uLmNvbHVtbkRlZi5maWx0ZXJUeXBlIHx8IFxcJ3N0cmluZ1xcJykgKyBcXCcuaHRtbFxcJ1wiPjwvbmctaW5jbHVkZT5cXG4nICtcbiAgICAnICAgICAgICAgICAgICAgIDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIlJlbW92ZUZpbHRlclwiIGNsYXNzPVwibWQtc2Vjb25kYXJ5XCIgbmctY2xpY2s9XCJyZW1vdmVGaWx0ZXIoZmlsdGVyKVwiPjxuZy1tZC1pY29uIGljb249XCJkZWxldGVcIj48L25nLW1kLWljb24+PC9tZC1idXR0b24+XFxuJyArXG4gICAgJyAgICAgICAgICAgIDwvbWQtbGlzdC1pdGVtPlxcbicgK1xuICAgICcgICAgICAgIDwvbWQtbGlzdD5cXG4nICtcbiAgICAnICAgIDwvbWQtZGlhbG9nLWNvbnRlbnQ+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgICAgPG1kLWRpYWxvZy1hY3Rpb25zIGZsZXg9XCJhdXRvXCI+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWJ1dHRvbiBhcmlhLWxhYmVsPVwiRGVsZXRlQWxsXCIgbmctY2xpY2s9XCJmaWx0ZXJzID0gW11cIiBuZy1kaXNhYmxlZD1cIiFmaWx0ZXJzLmxlbmd0aFwiPnt7XFwndC5EZWxldGVBbGxcXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbWQtYnV0dG9uPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIkNhbmNlbFwiIG5nLWNsaWNrPVwiY2FuY2VsKClcIj57e1xcJ3QuQ2FuY2VsXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnICAgICAgICA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJBcHBseVwiIG5nLWNsaWNrPVwiYXBwbHkoZmlsdGVycylcIj57e1xcJ3QuQXBwbHlcXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbWQtYnV0dG9uPlxcbicgK1xuICAgICcgICAgPC9tZC1kaWFsb2ctYWN0aW9ucz5cXG4nICtcbiAgICAnPC9tZC1kaWFsb2c+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGlhbG9nLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLW51bWJlci5odG1sJyxcbiAgICAnPGRpdiBsYXlvdXQ9XCJyb3dcIiBsYXlvdXQtYWxpZ249XCJjZW50ZXIgY2VudGVyXCI+XFxuJyArXG4gICAgJyAgICA8bGFiZWwgbmctYmluZD1cImZpbHRlci5jb2x1bW4uZGlzcGxheU5hbWVcIj48L2xhYmVsPlxcbicgK1xuICAgICcgICAgPG1kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgICAgICA8bGFiZWw+e3tcXCd0LkZyb21cXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbGFiZWw+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWlucHV0IG5nLW1vZGVsPVwiZmlsdGVyLmZyb21cIj48L21kLWlucHV0PlxcbicgK1xuICAgICcgICAgPC9tZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICA8bWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgICAgIDxsYWJlbD57e1xcJ3QuVG9cXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbGFiZWw+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWlucHV0IG5nLW1vZGVsPVwiZmlsdGVyLnRvXCI+PC9tZC1pbnB1dD5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbFwiOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItc3RyaW5nLmh0bWwnLFxuICAgICc8bWQtaW5wdXQtY29udGFpbmVyIGNsYXNzPVwibWQtYmxvY2tcIj5cXG4nICtcbiAgICAnICA8bGFiZWwgbmctYmluZD1cImZpbHRlci5jb2x1bW4uZGlzcGxheU5hbWVcIj48L2xhYmVsPlxcbicgK1xuICAgICcgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5nLW1vZGVsPVwiZmlsdGVyLnZhbHVlXCIgcmVxdWlyZWQ+XFxuJyArXG4gICAgJzwvbWQtaW5wdXQtY29udGFpbmVyPicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sXCI7IiwiUnguT2JzZXJ2YWJsZS5wcm90b3R5cGUuJGFwcGx5ID0gZnVuY3Rpb24gKHNjb3BlLCB0aGlzQXJnKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICByZXR1cm4gbmV3IFJ4LkFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG9ic2VydmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHNlbGYuc3Vic2NyaWJlKFxyXG4gICAgICAgICAgICBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHsgb2JzZXJ2ZXIub25OZXh0KGUpOyB9KTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcclxuICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQuYmluZChvYnNlcnZlcilcclxuICAgICAgICApO1xyXG4gICAgfSk7XHJcbn07IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFsnbmdNYXRlcmlhbCcsICduZ01kSWNvbnMnLCAndWkuZ3JpZCcsICd1aS5ncmlkLnJlc2l6ZUNvbHVtbnMnLCAndWkuZ3JpZC5tb3ZlQ29sdW1ucycsICd1aS5ncmlkLmluZmluaXRlU2Nyb2xsJ10pXHJcblxyXG4gICAgLy8gZGlyZWN0aXZlc1xyXG4gICAgLmRpcmVjdGl2ZSgneHBBdXRvY29tcGxldGUnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMveHAtYXV0b2NvbXBsZXRlJykpXHJcbiAgICAuZGlyZWN0aXZlKCd4cEdyaWQnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMveHAtZ3JpZCcpKVxyXG4gICAgLmRpcmVjdGl2ZSgneHBHcmlkZmlsdGVyQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3hwLWdyaWRmaWx0ZXItYnV0dG9uJykpXHJcblxyXG4gICAgLy8gZmlsdGVyc1xyXG4gICAgLmZpbHRlcigneHBDb21wb25lbnRzVHJhbnNsYXRlJywgcmVxdWlyZSgnLi9maWx0ZXJzL3hwQ29tcG9uZW50c1RyYW5zbGF0ZScpKVxyXG5cclxuICAgIC8vIHNlcnZpY2VzICBcclxuICAgIC5mYWN0b3J5KCd4cEdyaWRmaWx0ZXJEaWFsb2cnLCByZXF1aXJlKCcuL3NlcnZpY2VzL3hwR3JpZGZpbHRlckRpYWxvZycpKVxyXG4gICAgLmZhY3RvcnkoJ3hwR3JpZFNlcnZpY2UnLCByZXF1aXJlKCcuL3NlcnZpY2VzL3hwR3JpZFNlcnZpY2UnKSlcclxuICAgIC5mYWN0b3J5KCd4cENvbXBvbmVudHNUcmFuc2xhdGVTZXJ2aWNlJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy94cENvbXBvbmVudHNUcmFuc2xhdGVTZXJ2aWNlJykpXHJcblxyXG4gICAgLy8gdGVtcGxhdGVzXHJcbiAgICAucnVuKHJlcXVpcmUoJy4vdGVtcGxhdGVzJykpO1xyXG5cclxucmVxdWlyZSgnLi91dGlscy9yeCcpO1xyXG4iXX0=
