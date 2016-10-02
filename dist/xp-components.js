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

            scope.$watch('options.columnDefs', function (columns) {
                return scope.filters = computeFilters(columns);
            }, true);
            scope.$watch('filters', function (_) {
                return refresh.onNext(true);
            }, true);

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

function columnsComparer(a, b) {
    return a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0;
}

function loadFilters(columns) {
    var result = [];

    for (var i = 0; i < columns.length; i++) {
        var column = columns[i];
        var filters = angular.copy(column.filters || []);

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
        columns[i].filters = [];
    }for (var i = 0; i < filters.length; i++) {
        var filter = filters[i];
        filter.column.filters.push(filter);
        delete filter.column;
    }
}

module.exports = ['$mdDialog', '$timeout', function ($mdDialog, $timeout) {
    return function (options) {
        var gridOptions = options.gridOptions;


        var dialog = {
            bindToController: true,
            clickOutsideToClose: true,
            controller: ['$scope', '$mdDialog', function (scope, $mdDialog) {

                scope.columns = gridOptions.columnDefs.slice().sort(columnsComparer);
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

},{}],7:[function(require,module,exports){
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

},{"./ui-grid-header.html":8,"./ui-grid-row.html":9,"./uiGridHeaderCell.html":10,"./xp-gridfilter-date.html":11,"./xp-gridfilter-dialog.html":12,"./xp-gridfilter-number.html":13,"./xp-gridfilter-string.html":14}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
    '    ui-grid-cell>\n' +
    '</div>');
}]);

module.exports = "/templates/ui-grid-row.html";
},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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
    '                <ng-include flex="auto" src="\'/templates/xp-gridfilter-\' + (filter.column.filterType || \'string\') + \'.html\'"></ng-include>\n' +
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
},{}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
'use strict';

angular.module('xp.components', ['ngMaterial', 'ngMdIcons', 'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.moveColumns', 'ui.grid.infiniteScroll'])

// directives
.directive('xpAutocomplete', require('./directives/xp-autocomplete')).directive('xpGrid', require('./directives/xp-grid')).directive('xpGridfilterButton', require('./directives/xp-gridfilter-button'))

// filters
.filter('xpComponentsTranslate', require('./filters/xpComponentsTranslate'))

// services  
.factory('xpGridfilterDialog', require('./services/xpGridfilterDialog')).factory('xpComponentsTranslateService', require('./services/xpComponentsTranslateService'))

// templates
.run(require('./templates'));

require('./utils/rx');

},{"./directives/xp-autocomplete":1,"./directives/xp-grid":2,"./directives/xp-gridfilter-button":3,"./filters/xpComponentsTranslate":4,"./services/xpComponentsTranslateService":5,"./services/xpGridfilterDialog":6,"./templates":7,"./utils/rx":15}]},{},[16])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGRpcmVjdGl2ZXNcXHhwLWF1dG9jb21wbGV0ZS5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZC5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZGZpbHRlci1idXR0b24uanMiLCJzcmNcXGZpbHRlcnNcXHhwQ29tcG9uZW50c1RyYW5zbGF0ZS5qcyIsInNyY1xcc2VydmljZXNcXHhwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UuanMiLCJzcmNcXHNlcnZpY2VzXFx4cEdyaWRmaWx0ZXJEaWFsb2cuanMiLCJzcmNcXHRlbXBsYXRlc1xcaW5kZXguanMiLCJzcmMvdGVtcGxhdGVzL3VpLWdyaWQtaGVhZGVyLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3VpLWdyaWQtcm93Lmh0bWwiLCJzcmMvdGVtcGxhdGVzL3VpR3JpZEhlYWRlckNlbGwuaHRtbCIsInNyYy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kYXRlLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGlhbG9nLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItbnVtYmVyLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItc3RyaW5nLmh0bWwiLCJzcmNcXHV0aWxzXFxyeC5qcyIsInNyY1xcbGliLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQSxTQUFTLGdCQUFULENBQTBCLENBQTFCLEVBQTZCO0FBQ3pCLFdBQU8sQ0FBQyxLQUFLLEVBQU4sRUFBVSxXQUFWLEVBQVA7QUFDSDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsQ0FBQyxRQUFELEVBQVcsVUFBVSxNQUFWLEVBQWtCO0FBQzFDLFdBQU87QUFDSCxrQkFBVSxHQURQO0FBRUgsZUFBTztBQUNILHFCQUFTLElBRE47QUFFSCwwQkFBYyxJQUZYO0FBR0gsNEJB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LEVBQTZDLGVBQWUsR0FBZixDQUFtQixZQUFuQixDQUE3QztBQUNILENBTGdCLENBQWpCOzs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2ZBLEdBQUcsVUFBSCxDQUFjLFNBQWQsQ0FBd0IsTUFBeEIsR0FBaUMsVUFBVSxLQUFWLEVBQWlCLE9BQWpCLEVBQTBCO0FBQ3ZELFFBQUksT0FBTyxJQUFYO0FBQ0EsV0FBTyxJQUFJLEdBQUcsbUJBQVAsQ0FBMkIsVUFBVSxRQUFWLEVBQW9CO0FBQ2xELGVBQU8sS0FBSyxTQUFMLENBQ0gsVUFBVSxDQUFWLEVBQWE7QUFDVCxrQkFBTSxNQUFOLENBQWEsWUFBWTtBQUFFLHlCQUFTLE1BQVQsQ0FBZ0IsQ0FBaEI7QUFBcUIsYUFBaEQ7QUFDSCxTQUhFLEVBSUgsU0FBUyxPQUFULENBQWlCLElBQWpCLENBQXNCLFFBQXRCLENBSkcsRUFLSCxTQUFTLFdBQVQsQ0FBcUIsSUFBckIsQ0FBMEIsUUFBMUIsQ0FMRyxDQUFQO0FBT0gsS0FSTSxDQUFQO0FBU0gsQ0FYRDs7Ozs7QUNBQSxRQUNLLE1BREwsQ0FDWSxlQURaLEVBQzZCLENBQUMsWUFBRCxFQUFlLFdBQWYsRUFBNEIsU0FBNUIsRUFBdUMsdUJBQXZDLEVBQWdFLHFCQUFoRSxFQUF1Rix3QkFBdkYsQ0FEN0I7O0FBR0k7QUFISixDQUlLLFNBSkwsQ0FJZSxnQkFKZixFQUlpQyxRQUFRLDhCQUFSLENBSmpDLEVBS0ssU0FMTCxDQUtlLFFBTGYsRUFLeUIsUUFBUSxzQkFBUixDQUx6QixFQU1LLFNBTkwsQ0FNZSxvQkFOZixFQU1xQyxRQUFRLG1DQUFSLENBTnJDOztBQVFJO0FBUkosQ0FTSyxNQVRMLENBU1ksdUJBVFosRUFTcUMsUUFBUSxpQ0FBUixDQVRyQzs7QUFXSTtBQVhKLENBWUssT0FaTCxDQVlhLG9CQVpiLEVBWW1DLFFBQVEsK0JBQVIsQ0FabkMsRUFhSyxPQWJMLENBYWEsOEJBYmIsRUFhNkMsUUFBUSx5Q0FBUixDQWI3Qzs7QUFlSTtBQWZKLENBZ0JLLEdBaEJMLENBZ0JTLFFBQVEsYUFBUixDQWhCVDs7QUFrQkEsUUFBUSxZQUFSIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIHNlYXJjaGFibGVTdHJpbmcoYSkge1xyXG4gICAgcmV0dXJuIChhIHx8ICcnKS50b0xvd2VyQ2FzZSgpOyAgICAgICAgXHJcbn1cclxuXHJcbi8vLyBleGFtcGxlXHJcbi8vL1xyXG4vLy8gICAgIDx4cC1hdXRvY29tcGxldGUgeHAtaXRlbXM9XCJpdGVtIGluIGl0ZW1zXCIgeHAtaXRlbS10ZXh0PVwiaXRlbS5kaXNwbGF5XCI+PC94cC1hdXRvY29tcGxldGU+XHJcbi8vL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBbJyRwYXJzZScsIGZ1bmN0aW9uICgkcGFyc2UpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICB4cEl0ZW1zOiAnPT8nLFxyXG4gICAgICAgICAgICB4cFNlYXJjaFRleHQ6ICc9PycsXHJcbiAgICAgICAgICAgIHhwU2VsZWN0ZWRJdGVtOiAnPT8nLFxyXG4gICAgICAgICAgICB4cEZsb2F0aW5nTGFiZWw6ICdAJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGU6IGZ1bmN0aW9uIChlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICByZXR1cm4gYDxtZC1hdXRvY29tcGxldGVcclxuICAgICAgICAgICAgICAgIG1kLWl0ZW1zPVwiaXRlbSBpbiBfaXRlbXNcIlxyXG4gICAgICAgICAgICAgICAgbWQtaXRlbS10ZXh0PVwiJHthdHRycy54cEl0ZW1UZXh0fVwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWFyY2gtdGV4dD1cInhwU2VhcmNoVGV4dFwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWFyY2gtdGV4dC1jaGFuZ2U9XCIke2F0dHJzLnhwU2VhcmNoVGV4dENoYW5nZX1cIlxyXG4gICAgICAgICAgICAgICAgbWQtc2VsZWN0ZWQtaXRlbT1cInhwU2VsZWN0ZWRJdGVtXCJcclxuICAgICAgICAgICAgICAgIG1kLXNlbGVjdGVkLWl0ZW0tY2hhbmdlPVwic2VsZWN0ZWRJdGVtQ2hhbmdlKHhwU2VsZWN0ZWRJdGVtKVwiXHJcbiAgICAgICAgICAgICAgICBtZC1taW4tbGVuZ3RoPVwiMFwiXHJcbiAgICAgICAgICAgICAgICBtZC1hdXRvc2VsZWN0PVwidHJ1ZVwiXHJcbiAgICAgICAgICAgICAgICBtZC1tYXRjaC1jYXNlLWluc2Vuc2l0aXZlPVwidHJ1ZVwiXHJcbiAgICAgICAgICAgICAgICBtZC1mbG9hdGluZy1sYWJlbD1cInt7eHBGbG9hdGluZ0xhYmVsfX1cIj5cclxuICAgICAgICAgICAgICAgICAgICA8bWQtaXRlbS10ZW1wbGF0ZT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gbWQtaGlnaGxpZ2h0LXRleHQ9XCJ4cFNlYXJjaFRleHRcIiBtZC1oaWdobGlnaHQtZmxhZ3M9XCJpXCI+e3ske2F0dHJzLnhwSXRlbVRleHR9fX08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9tZC1pdGVtLXRlbXBsYXRlPlxyXG4gICAgICAgICAgICA8L21kLWF1dG9jb21wbGV0ZT5gO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICB2YXIgZ2V0SXRlbVRleHQgPSAkcGFyc2UoYXR0cnMueHBJdGVtVGV4dCk7XHJcbiAgICAgICAgICAgIHZhciBpdGVtcztcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLl9pdGVtcyA9IFtdO1xyXG4gICAgICAgICAgICBzY29wZS5fc2VhcmNoX3RleHQgPSAnJztcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkSXRlbUNoYW5nZSA9IGl0ZW0gPT4gc2NvcGUuJHBhcmVudC4kZXZhbChhdHRycy54cFNlbGVjdGVkSXRlbUNoYW5nZSwgeyBpdGVtIH0pO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGBbeHBJdGVtcyx4cFNlYXJjaFRleHRdYCwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpdGVtcyA9IGVbMF0gfHwgW107XHJcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGVbMV0gfHwgJyc7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXJyYXkgPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICB0ZXh0ID0gc2VhcmNoYWJsZVN0cmluZyh0ZXh0KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGV4dCB8fCBzZWFyY2hhYmxlU3RyaW5nKGdldEl0ZW1UZXh0KHNjb3BlLCB7IGl0ZW06IGl0ZW1zW2ldIH0pKS5pbmRleE9mKHRleHQpICE9PSAtMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyYXkucHVzaChpdGVtc1tpXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuX2l0ZW1zID0gYXJyYXk7XHJcblxyXG4gICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XTsiLCJtb2R1bGUuZXhwb3J0cyA9IFsnJHEnLCBmdW5jdGlvbiAoJHEpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZTogdHJ1ZSxcclxuICAgICAgICB0ZW1wbGF0ZTogYDxkaXYgbGF5b3V0PVwiY29sdW1uXCIgY2xhc3M9XCJ4cC1ncmlkXCI+XHJcbiAgICAgICAgICAgIDx4cC1ncmlkZmlsdGVyLWJ1dHRvbiB4cC1ncmlkLW9wdGlvbnM9XCJvcHRpb25zXCIgbGF5b3V0PVwicm93XCIgbGF5b3V0LWFsaWduPVwiZW5kIGNlbnRlclwiPjwveHAtZ3JpZGZpbHRlci1idXR0b24+XHJcbiAgICAgICAgICAgIDxkaXYgdWktZ3JpZD1cIm9wdGlvbnNcIiBmbGV4IHVpLWdyaWQtcmVzaXplLWNvbHVtbnMgdWktZ3JpZC1tb3ZlLWNvbHVtbnMgdWktZ3JpZC1pbmZpbml0ZS1zY3JvbGw+PC9kaXY+XHJcbiAgICAgICAgPC9kaXY+YCxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgc29ydDtcclxuICAgICAgICAgICAgdmFyIG11c3RSZWxvYWQ7XHJcbiAgICAgICAgICAgIHZhciBwYWdlID0gMDtcclxuICAgICAgICAgICAgdmFyIHJlZnJlc2ggPSBuZXcgUnguU3ViamVjdCgpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUub3B0aW9ucyA9IHNjb3BlLiRwYXJlbnQuJGV2YWwoYXR0cnMueHBHcmlkT3B0aW9ucyB8fCAne30nKSB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0gYW5ndWxhci5leHRlbmQoc2NvcGUub3B0aW9ucywge1xyXG4gICAgICAgICAgICAgICAgZGF0YTogW10sXHJcbiAgICAgICAgICAgICAgICBpbmZpbml0ZVNjcm9sbFJvd3NGcm9tRW5kOiAxMDAsXHJcbiAgICAgICAgICAgICAgICBpbmZpbml0ZVNjcm9sbERvd246IHRydWUsXHJcbiAgICAgICAgICAgICAgICBvblJlZ2lzdGVyQXBpOiBmdW5jdGlvbiAoZ3JpZEFwaSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLm9wdGlvbnMuZ3JpZEFwaSA9IGdyaWRBcGk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZEFwaS5jb3JlLm9uLnNvcnRDaGFuZ2VkKHNjb3BlLCBzb3J0Q2hhbmdlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc29ydENoYW5nZWQoZ3JpZEFwaS5ncmlkLCBbb3B0aW9ucy5jb2x1bW5EZWZzWzFdXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZEFwaS5pbmZpbml0ZVNjcm9sbC5vbi5uZWVkTG9hZE1vcmVEYXRhKHNjb3BlLCBuZWVkTG9hZE1vcmVEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goJ29wdGlvbnMuY29sdW1uRGVmcycsIGNvbHVtbnMgPT4gc2NvcGUuZmlsdGVycyA9IGNvbXB1dGVGaWx0ZXJzKGNvbHVtbnMpLCB0cnVlKTtcclxuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKCdmaWx0ZXJzJywgXyA9PiByZWZyZXNoLm9uTmV4dCh0cnVlKSwgdHJ1ZSk7IFxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gbmVlZExvYWRNb3JlRGF0YSgpIHtcclxuICAgICAgICAgICAgICAgIHJlZnJlc2gub25OZXh0KGZhbHNlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gc29ydENoYW5nZWQoZ3JpZCwgc29ydENvbHVtbnMpIHtcclxuICAgICAgICAgICAgICAgIHNvcnQgPSBjb21wdXRlU29ydFN0cmluZyhzb3J0Q29sdW1ucyk7XHJcbiAgICAgICAgICAgICAgICByZWZyZXNoLm9uTmV4dCh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVmcmVzaFxyXG4gICAgICAgICAgICAgICAgLm1hcChlID0+IG11c3RSZWxvYWQgfD0gZSlcclxuICAgICAgICAgICAgICAgIC5kZWJvdW5jZSgxKVxyXG4gICAgICAgICAgICAgICAgLiRhcHBseShzY29wZSlcclxuICAgICAgICAgICAgICAgIC5mbGF0TWFwTGF0ZXN0KGZ1bmN0aW9uIChyZWxvYWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBtdXN0UmVsb2FkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFnZSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IGFuZ3VsYXIuZXh0ZW5kKHsgcGFnZSwgc29ydCwgcGFnZVNpemU6IDEwMCB9LCBzY29wZS5maWx0ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gb3B0aW9ucy5mZXRjaChwYXJhbXMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5zdWJzY3JpYmUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IFJ4Lk9ic2VydmFibGUuZnJvbVByb21pc2UoJHEud2hlbihyZXN1bHQpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5jYXRjaChfID0+IFJ4Lk9ic2VydmFibGUuZW1wdHkoKSk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLiRhcHBseShzY29wZSlcclxuICAgICAgICAgICAgICAgIC50YXAoZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBwYWdlKys7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5kYXRhID0gb3B0aW9ucy5kYXRhLmNvbmNhdChkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5vcHRpb25zLmdyaWRBcGkuaW5maW5pdGVTY3JvbGwuZGF0YUxvYWRlZChmYWxzZSwgZGF0YS5sZW5ndGggPj0gMTAwKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuc3Vic2NyaWJlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XTtcclxuXHJcbmZ1bmN0aW9uIGNvbXB1dGVGaWx0ZXJzKGNvbHVtbnMpIHtcclxuICAgIHZhciBvID0ge307XHJcblxyXG4gICAgaWYgKGNvbHVtbnMpXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2x1bW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSBjb2x1bW5zW2ldO1xyXG4gICAgICAgICAgICB2YXIgZmlsdGVycyA9IGNvbHVtbi5maWx0ZXJzIHx8IFtdO1xyXG5cclxuICAgICAgICAgICAgaWYgKGZpbHRlcnMubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgb1tjb2x1bW4ubmFtZV0gPSBmaWx0ZXJzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICByZXR1cm4gbztcclxufVxyXG5cclxuZnVuY3Rpb24gY29tcHV0ZVNvcnRTdHJpbmcoc29ydENvbHVtbnMpIHtcclxuICAgIHZhciBzID0gJyc7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzb3J0Q29sdW1ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmIChzKSBzICs9ICcsJztcclxuXHJcbiAgICAgICAgdmFyIGNvbCA9IHNvcnRDb2x1bW5zW2ldO1xyXG4gICAgICAgIGlmIChjb2wuc29ydClcclxuICAgICAgICAgICAgcyArPSBjb2wubmFtZSArICc6JyArIGNvbC5zb3J0LmRpcmVjdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcztcclxufSIsIm1vZHVsZS5leHBvcnRzID0gWyd4cEdyaWRmaWx0ZXJEaWFsb2cnLCAnJHBhcnNlJywgZnVuY3Rpb24gKHhwR3JpZGZpbHRlckRpYWxvZywgcGFyc2UpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgc2NvcGU6IHRydWUsXHJcbiAgICAgICAgdGVtcGxhdGU6IGA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJGaWx0ZXJcIiBuZy1jbGljaz1cInNob3dEaWFsb2coKVwiIG5nLWNsYXNzPVwieydtZC1wcmltYXJ5JzogZmlsdGVyZWQoKX1cIj5cclxuICAgICAgICAgICAgPG5nLW1kLWljb24gaWNvbj1cImZpbHRlcl9saXN0XCI+PC9uZy1tZC1pY29uPlxyXG4gICAgICAgIDwvbWQtYnV0dG9uPmAsXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHBhcnNlKGF0dHJzLnhwR3JpZE9wdGlvbnMpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuZmlsdGVyZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgeyBjb2x1bW5EZWZzIH0gPSBvcHRpb25zKHNjb3BlKSB8fCAwO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbHVtbkRlZnMpXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2x1bW5EZWZzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29sdW1uRGVmc1tpXS5maWx0ZXJzICYmIGNvbHVtbkRlZnNbaV0uZmlsdGVycy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnNob3dEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZ3JpZE9wdGlvbnMgPSBvcHRpb25zKHNjb3BlKSB8fCB7fTtcclxuICAgICAgICAgICAgICAgIHhwR3JpZGZpbHRlckRpYWxvZyh7IGdyaWRPcHRpb25zIH0pO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1dOyIsIm1vZHVsZS5leHBvcnRzID0gWyd4cENvbXBvbmVudHNUcmFuc2xhdGVTZXJ2aWNlJywgZnVuY3Rpb24gKHNlcnZpY2UpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiB4cENvbXBvbmVudHNUcmFuc2xhdGUodmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gc2VydmljZSh2YWx1ZS5zdWJzdHJpbmcoMikpIHx8IHZhbHVlO1xyXG4gICAgfTtcclxufV07IiwibW9kdWxlLmV4cG9ydHMgPSBbZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIHZhciBjdXJyZW50ID0gJ2VuJztcclxuXHJcbiAgICB2YXIgZiA9IGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICByZXR1cm4gZi5sb2NhbGVzW2N1cnJlbnRdW2tleV07XHJcbiAgICB9XHJcblxyXG4gICAgZi5sYW5nID0gZnVuY3Rpb24gKGxhbmcpIHtcclxuICAgICAgICBpZiAoIWxhbmcpIHJldHVybiBjdXJyZW50O1xyXG4gICAgICAgIGN1cnJlbnQgPSBsYW5nO1xyXG4gICAgfTtcclxuXHJcbiAgICBmLmxvY2FsZXMgPSB7XHJcbiAgICAgICAgZW46IHtcclxuICAgICAgICAgICAgQXBwbHk6ICdBcHBseScsXHJcbiAgICAgICAgICAgIENhbmNlbDogJ0NhbmNlbCcsXHJcbiAgICAgICAgICAgIENob29zZUFDb2x1bW46ICdDaG9vc2UgYSBjb2x1bW4nLFxyXG4gICAgICAgICAgICBEZWxldGVBbGw6ICdEZWxldGUgQWxsJyxcclxuICAgICAgICAgICAgRmlsdGVyczogJ0ZpbHRlcnMnLFxyXG4gICAgICAgICAgICBGcm9tOiAnRnJvbScsXHJcbiAgICAgICAgICAgIFRvOiAnVG8nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmcjoge1xyXG4gICAgICAgICAgICBBcHBseTogJ0FwcGxpcXVlcicsXHJcbiAgICAgICAgICAgIENhbmNlbDogJ0FubnVsZXInLFxyXG4gICAgICAgICAgICBDaG9vc2VBQ29sdW1uOiAnQ2hvaXNpc3NleiB1bmUgY29sb25uZScsXHJcbiAgICAgICAgICAgIERlbGV0ZUFsbDogJ1N1cHByaW1lciB0b3V0JyxcclxuICAgICAgICAgICAgRmlsdGVyczogJ0ZpbHRyZXMnLFxyXG4gICAgICAgICAgICBGcm9tOiAnRGUnLFxyXG4gICAgICAgICAgICBUbzogJ8OAJ1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIGY7XHJcbn1dOyIsImZ1bmN0aW9uIGNvbHVtbnNDb21wYXJlcihhLCBiKSB7XHJcbiAgICByZXR1cm4gYS5kaXNwbGF5TmFtZSA8IGIuZGlzcGxheU5hbWUgPyAtMSA6IGEuZGlzcGxheU5hbWUgPiBiLmRpc3BsYXlOYW1lID8gMSA6IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRGaWx0ZXJzKGNvbHVtbnMpIHtcclxuICAgIHZhciByZXN1bHQgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgY29sdW1uID0gY29sdW1uc1tpXTtcclxuICAgICAgICB2YXIgZmlsdGVycyA9IGFuZ3VsYXIuY29weShjb2x1bW4uZmlsdGVycyB8fCBbXSk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZmlsdGVycy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICB2YXIgZmlsdGVyID0gZmlsdGVyc1tqXTtcclxuICAgICAgICAgICAgZmlsdGVyLmNvbHVtbiA9IGNvbHVtbjtcclxuICAgICAgICAgICAgcmVzdWx0LnB1c2goZmlsdGVyKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2F2ZUZpbHRlcnMoY29sdW1ucywgZmlsdGVycykge1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2x1bW5zLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGNvbHVtbnNbaV0uZmlsdGVycyA9IFtdO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmlsdGVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBmaWx0ZXIgPSBmaWx0ZXJzW2ldO1xyXG4gICAgICAgIGZpbHRlci5jb2x1bW4uZmlsdGVycy5wdXNoKGZpbHRlcik7XHJcbiAgICAgICAgZGVsZXRlIGZpbHRlci5jb2x1bW47XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gWyckbWREaWFsb2cnLCAnJHRpbWVvdXQnLCBmdW5jdGlvbiAoJG1kRGlhbG9nLCAkdGltZW91dCkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChvcHRpb25zKSB7XHJcbiAgICAgICAgdmFyIHsgZ3JpZE9wdGlvbnMgfSA9IG9wdGlvbnM7XHJcblxyXG4gICAgICAgIHZhciBkaWFsb2cgPSB7XHJcbiAgICAgICAgICAgIGJpbmRUb0NvbnRyb2xsZXI6IHRydWUsXHJcbiAgICAgICAgICAgIGNsaWNrT3V0c2lkZVRvQ2xvc2U6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRtZERpYWxvZycsIGZ1bmN0aW9uIChzY29wZSwgJG1kRGlhbG9nKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuY29sdW1ucyA9IGdyaWRPcHRpb25zLmNvbHVtbkRlZnMuc2xpY2UoKS5zb3J0KGNvbHVtbnNDb21wYXJlcik7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5maWx0ZXJzID0gbG9hZEZpbHRlcnMoc2NvcGUuY29sdW1ucyk7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuYXBwbHkgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzYXZlRmlsdGVycyhzY29wZS5jb2x1bW5zLCBzY29wZS5maWx0ZXJzKTtcclxuICAgICAgICAgICAgICAgICAgICAkbWREaWFsb2cuaGlkZSh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmNhbmNlbCA9IF8gPT4gJG1kRGlhbG9nLmNhbmNlbCgpO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuYXV0b0NvbXBsZXRlVGV4dCA9ICcnO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuc2VsZWN0ZWRDb2x1bW4gPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLnJlbW92ZUZpbHRlciA9IGZ1bmN0aW9uIChmaWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBzY29wZS5maWx0ZXJzLmluZGV4T2YoZmlsdGVyKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggIT09IC0xKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5maWx0ZXJzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHdoZW4gYSBjb2x1bW4gaXMgc2VsZWN0ZWQgaW4gdGhlIGF1dG9jb21wbGV0ZVxyXG4gICAgICAgICAgICAgICAgc2NvcGUuc2VsZWN0ZWRDb2x1bW5DaGFuZ2VkID0gZnVuY3Rpb24gKHNlbGVjdGVkQ29sdW1uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzZWxlY3RlZENvbHVtbikgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBhZGQgY29sdW1ucyB0byB0aGUgbGlzdCBvZiBmaWx0ZXJzIGZvciBlZGl0aW5nLlxyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmZpbHRlcnMudW5zaGlmdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogc2VsZWN0ZWRDb2x1bW5cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjbGVhciB0aGUgYXV0b2NvbXBsZXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmF1dG9Db21wbGV0ZVRleHQgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuc2VsZWN0ZWRDb2x1bW4gPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnhwLWdyaWRmaWx0ZXItaXRlbSBpbnB1dCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5mb2N1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfV0sXHJcbiAgICAgICAgICAgIGVzY2FwZVRvQ2xvc2U6IHRydWUsXHJcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sJ1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJldHVybiAkbWREaWFsb2cuc2hvdyhkaWFsb2cpO1xyXG4gICAgfTtcclxufV07IiwicmVxdWlyZSgnLi94cC1ncmlkZmlsdGVyLWRhdGUuaHRtbCcpO1xyXG5yZXF1aXJlKCcuL3hwLWdyaWRmaWx0ZXItZGlhbG9nLmh0bWwnKTtcclxucmVxdWlyZSgnLi94cC1ncmlkZmlsdGVyLW51bWJlci5odG1sJyk7XHJcbnJlcXVpcmUoJy4veHAtZ3JpZGZpbHRlci1zdHJpbmcuaHRtbCcpO1xyXG5cclxudmFyIHVpR3JpZEhlYWRlckNlbGwgPSByZXF1aXJlKCcuL3VpR3JpZEhlYWRlckNlbGwuaHRtbCcpO1xyXG52YXIgdWlHcmlkUm93ID0gcmVxdWlyZSgnLi91aS1ncmlkLXJvdy5odG1sJyk7XHJcbnZhciB1aUdyaWRIZWFkZXIgPSByZXF1aXJlKCcuL3VpLWdyaWQtaGVhZGVyLmh0bWwnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7XHJcbiAgICAvL1JlcGxhY2UgdWktZ3JpZCB0ZW1wbGF0ZXMgXHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3VpLWdyaWQvdWlHcmlkSGVhZGVyQ2VsbCcsICR0ZW1wbGF0ZUNhY2hlLmdldCh1aUdyaWRIZWFkZXJDZWxsKSk7XHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3VpLWdyaWQvdWktZ3JpZC1yb3cnLCAkdGVtcGxhdGVDYWNoZS5nZXQodWlHcmlkUm93KSk7XHJcbiAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ3VpLWdyaWQvdWktZ3JpZC1oZWFkZXInLCAkdGVtcGxhdGVDYWNoZS5nZXQodWlHcmlkSGVhZGVyKSk7XHJcbn1dOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3VpLWdyaWQtaGVhZGVyLmh0bWwnLFxuICAgICc8ZGl2XFxuJyArXG4gICAgJyAgcm9sZT1cInJvd2dyb3VwXCJcXG4nICtcbiAgICAnICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyXCI+IDwhLS0gdGhlYWRlciAtLT5cXG4nICtcbiAgICAnICA8ZGl2XFxuJyArXG4gICAgJyAgICBjbGFzcz1cInVpLWdyaWQtdG9wLXBhbmVsXCI+XFxuJyArXG4gICAgJyAgICA8ZGl2XFxuJyArXG4gICAgJyAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItdmlld3BvcnRcIj5cXG4nICtcbiAgICAnICAgICAgPGRpdlxcbicgK1xuICAgICcgICAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2FudmFzXCI+XFxuJyArXG4gICAgJyAgICAgICAgPGRpdlxcbicgK1xuICAgICcgICAgICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jZWxsLXdyYXBwZXJcIlxcbicgK1xuICAgICcgICAgICAgICAgbmctc3R5bGU9XCJjb2xDb250YWluZXIuaGVhZGVyQ2VsbFdyYXBwZXJTdHlsZSgpXCI+XFxuJyArXG4gICAgJyAgICAgICAgICA8ZGl2XFxuJyArXG4gICAgJyAgICAgICAgICAgIHJvbGU9XCJyb3dcIlxcbicgK1xuICAgICcgICAgICAgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNlbGwtcm93XCI+XFxuJyArXG4gICAgJyAgICAgICAgICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgICAgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNlbGwgdWktZ3JpZC1jbGVhcmZpeFwiXFxuJyArXG4gICAgJyAgICAgICAgICAgICAgbmctcmVwZWF0PVwiY29sIGluIGNvbENvbnRhaW5lci5yZW5kZXJlZENvbHVtbnMgdHJhY2sgYnkgY29sLnVpZFwiXFxuJyArXG4gICAgJyAgICAgICAgICAgICAgdWktZ3JpZC1oZWFkZXItY2VsbFxcbicgK1xuICAgICcgICAgICAgICAgICAgIG1kLWNvbG9ycz1cIjo6e2JhY2tncm91bmQ6IFxcJ2JhY2tncm91bmRcXCd9XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgICBjb2w9XCJjb2xcIlxcbicgK1xuICAgICcgICAgICAgICAgICAgIHJlbmRlci1pbmRleD1cIiRpbmRleFwiPlxcbicgK1xuICAgICcgICAgICAgICAgICA8L2Rpdj5cXG4nICtcbiAgICAnICAgICAgICAgIDwvZGl2PlxcbicgK1xuICAgICcgICAgICAgIDwvZGl2PlxcbicgK1xuICAgICcgICAgICA8L2Rpdj5cXG4nICtcbiAgICAnICAgIDwvZGl2PlxcbicgK1xuICAgICcgIDwvZGl2PlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMvdWktZ3JpZC1oZWFkZXIuaHRtbFwiOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3VpLWdyaWQtcm93Lmh0bWwnLFxuICAgICc8ZGl2IG5nLXJlcGVhdD1cIihjb2xSZW5kZXJJbmRleCwgY29sKSBpbiBjb2xDb250YWluZXIucmVuZGVyZWRDb2x1bW5zIHRyYWNrIGJ5IGNvbC51aWRcIiB1aS1ncmlkLW9uZS1iaW5kLWlkLWdyaWQ9XCJyb3dSZW5kZXJJbmRleCArIFxcJy1cXCcgKyBjb2wudWlkICsgXFwnLWNlbGxcXCdcIlxcbicgK1xuICAgICcgICAgY2xhc3M9XCJ1aS1ncmlkLWNlbGxcIiBuZy1jbGFzcz1cInsgXFwndWktZ3JpZC1yb3ctaGVhZGVyLWNlbGxcXCc6IGNvbC5pc1Jvd0hlYWRlciB9XCIgbWQtY29sb3JzPVwiOjp7YmFja2dyb3VuZDogXFwnYmFja2dyb3VuZC1odWUtXFwnICsgKHJvd1JlbmRlckluZGV4ICUgMiArIDEpfVwiIHJvbGU9XCJ7e2NvbC5pc1Jvd0hlYWRlciA/IFxcJ3Jvd2hlYWRlclxcJyA6IFxcJ2dyaWRjZWxsXFwnfX1cIlxcbicgK1xuICAgICcgICAgdWktZ3JpZC1jZWxsPlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMvdWktZ3JpZC1yb3cuaHRtbFwiOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3VpR3JpZEhlYWRlckNlbGwuaHRtbCcsXG4gICAgJzxkaXZcXG4nICtcbiAgICAnICByb2xlPVwiY29sdW1uaGVhZGVyXCJcXG4nICtcbiAgICAnICBuZy1jbGFzcz1cInsgXFwnc29ydGFibGVcXCc6IHNvcnRhYmxlIH1cIlxcbicgK1xuICAgICcgIHVpLWdyaWQtb25lLWJpbmQtYXJpYS1sYWJlbGxlZGJ5LWdyaWQ9XCJjb2wudWlkICsgXFwnLWhlYWRlci10ZXh0IFxcJyArIGNvbC51aWQgKyBcXCctc29ydGRpci10ZXh0XFwnXCJcXG4nICtcbiAgICAnICBhcmlhLXNvcnQ9XCJ7e2NvbC5zb3J0LmRpcmVjdGlvbiA9PSBhc2MgPyBcXCdhc2NlbmRpbmdcXCcgOiAoIGNvbC5zb3J0LmRpcmVjdGlvbiA9PSBkZXNjID8gXFwnZGVzY2VuZGluZ1xcJyA6ICghY29sLnNvcnQuZGlyZWN0aW9uID8gXFwnbm9uZVxcJyA6IFxcJ290aGVyXFwnKSl9fVwiPlxcbicgK1xuICAgICcgIDxtZC1idXR0b25cXG4nICtcbiAgICAnICAgIHJvbGU9XCJidXR0b25cIlxcbicgK1xuICAgICcgICAgdGFiaW5kZXg9XCIwXCJcXG4nICtcbiAgICAnICAgIGNsYXNzPVwidWktZ3JpZC1jZWxsLWNvbnRlbnRzIHVpLWdyaWQtaGVhZGVyLWNlbGwtcHJpbWFyeS1mb2N1c1wiXFxuJyArXG4gICAgJyAgICBjb2wtaW5kZXg9XCJyZW5kZXJJbmRleFwiXFxuJyArXG4gICAgJyAgICB0aXRsZT1cIlRPT0xUSVBcIj5cXG4nICtcbiAgICAnICAgIDxzcGFuXFxuJyArXG4gICAgJyAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2VsbC1sYWJlbFwiXFxuJyArXG4gICAgJyAgICAgIHVpLWdyaWQtb25lLWJpbmQtaWQtZ3JpZD1cImNvbC51aWQgKyBcXCctaGVhZGVyLXRleHRcXCdcIj5cXG4nICtcbiAgICAnICAgICAge3sgY29sLmRpc3BsYXlOYW1lIENVU1RPTV9GSUxURVJTIH19XFxuJyArXG4gICAgJyAgICA8L3NwYW4+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgICAgPHNwYW5cXG4nICtcbiAgICAnICAgICAgdWktZ3JpZC1vbmUtYmluZC1pZC1ncmlkPVwiY29sLnVpZCArIFxcJy1zb3J0ZGlyLXRleHRcXCdcIlxcbicgK1xuICAgICcgICAgICB1aS1ncmlkLXZpc2libGU9XCJjb2wuc29ydC5kaXJlY3Rpb25cIlxcbicgK1xuICAgICcgICAgICBhcmlhLWxhYmVsPVwie3tnZXRTb3J0RGlyZWN0aW9uQXJpYUxhYmVsKCl9fVwiPlxcbicgK1xuICAgICcgICAgICA8aVxcbicgK1xuICAgICcgICAgICAgbmctY2xhc3M9XCJ7IFxcJ3VpLWdyaWQtaWNvbi11cC1kaXJcXCc6IGNvbC5zb3J0LmRpcmVjdGlvbiA9PSBhc2MsIFxcJ3VpLWdyaWQtaWNvbi1kb3duLWRpclxcJzogY29sLnNvcnQuZGlyZWN0aW9uID09IGRlc2MsIFxcJ3VpLWdyaWQtaWNvbi1ibGFua1xcJzogIWNvbC5zb3J0LmRpcmVjdGlvbiB9XCJcXG4nICtcbiAgICAnICAgICAgIHRpdGxlPVwie3tpc1NvcnRQcmlvcml0eVZpc2libGUoKSA/IGkxOG4uaGVhZGVyQ2VsbC5wcmlvcml0eSArIFxcJyBcXCcgKyAoIGNvbC5zb3J0LnByaW9yaXR5ICsgMSApICA6IG51bGx9fVwiXFxuJyArXG4gICAgJyAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIj5cXG4nICtcbiAgICAnICAgICA8L2k+XFxuJyArXG4gICAgJyAgICAgPHN1YlxcbicgK1xuICAgICcgICAgICAgdWktZ3JpZC12aXNpYmxlPVwiaXNTb3J0UHJpb3JpdHlWaXNpYmxlKClcIlxcbicgK1xuICAgICcgICAgICAgY2xhc3M9XCJ1aS1ncmlkLXNvcnQtcHJpb3JpdHktbnVtYmVyXCI+XFxuJyArXG4gICAgJyAgICAgICB7e2NvbC5zb3J0LnByaW9yaXR5ICsgMX19XFxuJyArXG4gICAgJyAgICAgPC9zdWI+XFxuJyArXG4gICAgJyAgICA8L3NwYW4+XFxuJyArXG4gICAgJyAgPC9tZC1idXR0b24+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgIDxkaXYgdWktZ3JpZC1maWx0ZXI+PC9kaXY+XFxuJyArXG4gICAgJzwvZGl2PicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy91aUdyaWRIZWFkZXJDZWxsLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRhdGUuaHRtbCcsXG4gICAgJzxkaXYgbGF5b3V0PVwicm93XCIgbGF5b3V0LWFsaWduPVwiY2VudGVyIGNlbnRlclwiPlxcbicgK1xuICAgICcgICAgPGxhYmVsIG5nLWJpbmQ9XCJmaWx0ZXIuY29sdW1uLmRpc3BsYXlOYW1lXCI+PC9sYWJlbD5cXG4nICtcbiAgICAnICAgIDxtZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICAgICAgPGxhYmVsPnt7XFwndC5Gcm9tXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L2xhYmVsPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1kYXRlcGlja2VyIG5nLW1vZGVsPVwiZmlsdGVyLmZyb21cIiBuZy1jaGFuZ2U9XCJmaWx0ZXIudG8gPSBmaWx0ZXIuZnJvbSAmJiBmaWx0ZXIudG8gJiYgZmlsdGVyLnRvIDwgZmlsdGVyLmZyb20gPyBmaWx0ZXIuZnJvbSA6IGZpbHRlci50b1wiPjwvbWQtZGF0ZXBpY2tlcj5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgPG1kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgICAgICA8bGFiZWw+e3tcXCd0LlRvXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L2xhYmVsPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1kYXRlcGlja2VyIG5nLW1vZGVsPVwiZmlsdGVyLnRvXCIgbmctY2hhbmdlPVwiZmlsdGVyLmZyb20gPSBmaWx0ZXIuZnJvbSAmJiBmaWx0ZXIudG8gJiYgZmlsdGVyLmZyb20gPiBmaWx0ZXIudG8gPyBmaWx0ZXIudG8gOiBmaWx0ZXIuZnJvbVwiPjwvbWQtZGF0ZXBpY2tlcj5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kYXRlLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sJyxcbiAgICAnPG1kLWRpYWxvZyBjbGFzcz1cInhwLWdyaWRmaWx0ZXJcIiBhcmlhLWxhYmVsPVwiR3JpZEZpbHRlclwiIGxheW91dC1wYWRkaW5nPlxcbicgK1xuICAgICcgICAgPGRpdiBjbGFzcz1cImRpYWxvZ0hlYWRlclwiIGZsZXg9XCJhdXRvXCI+XFxuJyArXG4gICAgJyAgICAgICAgPHNwYW4+e3tcXCd0LkZpbHRlcnNcXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGUgfX08L3NwYW4+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgICAgICAgIDx4cC1hdXRvY29tcGxldGVcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtZmxvYXRpbmctbGFiZWw9XCJ7eyBcXCd0LkNob29zZUFDb2x1bW5cXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGUgfX1cIlxcbicgK1xuICAgICcgICAgICAgICAgICB4cC1pdGVtcz1cImNvbHVtbnNcIlxcbicgK1xuICAgICcgICAgICAgICAgICB4cC1pdGVtLXRleHQ9XCJpdGVtLmRpc3BsYXlOYW1lXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtc2VhcmNoLXRleHQ9XCJhdXRvQ29tcGxldGVUZXh0XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtc2VsZWN0ZWQtaXRlbT1cInNlbGVjdGVkQ29sdW1uXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtc2VsZWN0ZWQtaXRlbS1jaGFuZ2U9XCJzZWxlY3RlZENvbHVtbkNoYW5nZWQoaXRlbSlcIi8+XFxuJyArXG4gICAgJyAgICA8L2Rpdj5cXG4nICtcbiAgICAnXFxuJyArXG4gICAgJyAgICA8bWQtZGlhbG9nLWNvbnRlbnQgZmxleD1cIjEwMFwiPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1saXN0PlxcbicgK1xuICAgICcgICAgICAgICAgICA8bWQtbGlzdC1pdGVtIGNsYXNzPVwic2Vjb25kYXJ5LWJ1dHRvbi1wYWRkaW5nIHhwLWdyaWRmaWx0ZXItaXRlbVwiIG5nLXJlcGVhdD1cImZpbHRlciBpbiBmaWx0ZXJzXCI+XFxuJyArXG4gICAgJyAgICAgICAgICAgICAgICA8bmctaW5jbHVkZSBmbGV4PVwiYXV0b1wiIHNyYz1cIlxcJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1cXCcgKyAoZmlsdGVyLmNvbHVtbi5maWx0ZXJUeXBlIHx8IFxcJ3N0cmluZ1xcJykgKyBcXCcuaHRtbFxcJ1wiPjwvbmctaW5jbHVkZT5cXG4nICtcbiAgICAnICAgICAgICAgICAgICAgIDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIlJlbW92ZUZpbHRlclwiIGNsYXNzPVwibWQtc2Vjb25kYXJ5XCIgbmctY2xpY2s9XCJyZW1vdmVGaWx0ZXIoZmlsdGVyKVwiPjxuZy1tZC1pY29uIGljb249XCJkZWxldGVcIj48L25nLW1kLWljb24+PC9tZC1idXR0b24+XFxuJyArXG4gICAgJyAgICAgICAgICAgIDwvbWQtbGlzdC1pdGVtPlxcbicgK1xuICAgICcgICAgICAgIDwvbWQtbGlzdD5cXG4nICtcbiAgICAnICAgIDwvbWQtZGlhbG9nLWNvbnRlbnQ+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgICAgPG1kLWRpYWxvZy1hY3Rpb25zIGZsZXg9XCJhdXRvXCI+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWJ1dHRvbiBhcmlhLWxhYmVsPVwiRGVsZXRlQWxsXCIgbmctY2xpY2s9XCJmaWx0ZXJzID0gW11cIiBuZy1kaXNhYmxlZD1cIiFmaWx0ZXJzLmxlbmd0aFwiPnt7XFwndC5EZWxldGVBbGxcXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbWQtYnV0dG9uPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIkNhbmNlbFwiIG5nLWNsaWNrPVwiY2FuY2VsKClcIj57e1xcJ3QuQ2FuY2VsXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnICAgICAgICA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJBcHBseVwiIG5nLWNsaWNrPVwiYXBwbHkoZmlsdGVycylcIj57e1xcJ3QuQXBwbHlcXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbWQtYnV0dG9uPlxcbicgK1xuICAgICcgICAgPC9tZC1kaWFsb2ctYWN0aW9ucz5cXG4nICtcbiAgICAnPC9tZC1kaWFsb2c+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGlhbG9nLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLW51bWJlci5odG1sJyxcbiAgICAnPGRpdiBsYXlvdXQ9XCJyb3dcIiBsYXlvdXQtYWxpZ249XCJjZW50ZXIgY2VudGVyXCI+XFxuJyArXG4gICAgJyAgICA8bGFiZWwgbmctYmluZD1cImZpbHRlci5jb2x1bW4uZGlzcGxheU5hbWVcIj48L2xhYmVsPlxcbicgK1xuICAgICcgICAgPG1kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgICAgICA8bGFiZWw+e3tcXCd0LkZyb21cXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbGFiZWw+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWlucHV0IG5nLW1vZGVsPVwiZmlsdGVyLmZyb21cIj48L21kLWlucHV0PlxcbicgK1xuICAgICcgICAgPC9tZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICA8bWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgICAgIDxsYWJlbD57e1xcJ3QuVG9cXCcgfCB4cENvbXBvbmVudHNUcmFuc2xhdGV9fTwvbGFiZWw+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWlucHV0IG5nLW1vZGVsPVwiZmlsdGVyLnRvXCI+PC9tZC1pbnB1dD5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbFwiOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItc3RyaW5nLmh0bWwnLFxuICAgICc8bWQtaW5wdXQtY29udGFpbmVyIGNsYXNzPVwibWQtYmxvY2tcIj5cXG4nICtcbiAgICAnICA8bGFiZWwgbmctYmluZD1cImZpbHRlci5jb2x1bW4uZGlzcGxheU5hbWVcIj48L2xhYmVsPlxcbicgK1xuICAgICcgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5nLW1vZGVsPVwiZmlsdGVyLnZhbHVlXCIgcmVxdWlyZWQ+XFxuJyArXG4gICAgJzwvbWQtaW5wdXQtY29udGFpbmVyPicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sXCI7IiwiUnguT2JzZXJ2YWJsZS5wcm90b3R5cGUuJGFwcGx5ID0gZnVuY3Rpb24gKHNjb3BlLCB0aGlzQXJnKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICByZXR1cm4gbmV3IFJ4LkFub255bW91c09ic2VydmFibGUoZnVuY3Rpb24gKG9ic2VydmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHNlbGYuc3Vic2NyaWJlKFxyXG4gICAgICAgICAgICBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHsgb2JzZXJ2ZXIub25OZXh0KGUpOyB9KTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcclxuICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQuYmluZChvYnNlcnZlcilcclxuICAgICAgICApO1xyXG4gICAgfSk7XHJcbn07IiwiYW5ndWxhclxyXG4gICAgLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFsnbmdNYXRlcmlhbCcsICduZ01kSWNvbnMnLCAndWkuZ3JpZCcsICd1aS5ncmlkLnJlc2l6ZUNvbHVtbnMnLCAndWkuZ3JpZC5tb3ZlQ29sdW1ucycsICd1aS5ncmlkLmluZmluaXRlU2Nyb2xsJ10pXHJcblxyXG4gICAgLy8gZGlyZWN0aXZlc1xyXG4gICAgLmRpcmVjdGl2ZSgneHBBdXRvY29tcGxldGUnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMveHAtYXV0b2NvbXBsZXRlJykpXHJcbiAgICAuZGlyZWN0aXZlKCd4cEdyaWQnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMveHAtZ3JpZCcpKVxyXG4gICAgLmRpcmVjdGl2ZSgneHBHcmlkZmlsdGVyQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3hwLWdyaWRmaWx0ZXItYnV0dG9uJykpXHJcblxyXG4gICAgLy8gZmlsdGVyc1xyXG4gICAgLmZpbHRlcigneHBDb21wb25lbnRzVHJhbnNsYXRlJywgcmVxdWlyZSgnLi9maWx0ZXJzL3hwQ29tcG9uZW50c1RyYW5zbGF0ZScpKVxyXG5cclxuICAgIC8vIHNlcnZpY2VzICBcclxuICAgIC5mYWN0b3J5KCd4cEdyaWRmaWx0ZXJEaWFsb2cnLCByZXF1aXJlKCcuL3NlcnZpY2VzL3hwR3JpZGZpbHRlckRpYWxvZycpKVxyXG4gICAgLmZhY3RvcnkoJ3hwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UnLCByZXF1aXJlKCcuL3NlcnZpY2VzL3hwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UnKSlcclxuXHJcbiAgICAvLyB0ZW1wbGF0ZXNcclxuICAgIC5ydW4ocmVxdWlyZSgnLi90ZW1wbGF0ZXMnKSk7XHJcblxyXG5yZXF1aXJlKCcuL3V0aWxzL3J4Jyk7XHJcbiJdfQ==
