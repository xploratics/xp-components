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
                    scope.data = [];
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

},{}],5:[function(require,module,exports){
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

},{"./ui-grid-header.html":6,"./ui-grid-row.html":7,"./uiGridHeaderCell.html":8,"./xp-gridfilter-date.html":9,"./xp-gridfilter-dialog.html":10,"./xp-gridfilter-number.html":11,"./xp-gridfilter-string.html":12}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
    '        <label translate="xp-components.t.From"></label>\n' +
    '        <md-datepicker ng-model="filter.from" ng-change="filter.to = filter.from && filter.to && filter.to < filter.from ? filter.from : filter.to"></md-datepicker>\n' +
    '    </md-input-container>\n' +
    '    <md-input-container>\n' +
    '        <label translate="xp-components.t.To"></label>\n' +
    '        <md-datepicker ng-model="filter.to" ng-change="filter.from = filter.from && filter.to && filter.from > filter.to ? filter.to : filter.from"></md-datepicker>\n' +
    '    </md-input-container>\n' +
    '</div>');
}]);

module.exports = "/templates/xp-gridfilter-date.html";
},{}],10:[function(require,module,exports){
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
    '        <span>{{\'xp-components.t.Filters\' | translate }}</span>\n' +
    '\n' +
    '        <xp-autocomplete\n' +
    '            xp-floating-label="{{ \'xp-components.t.ChooseAColumn\' | translate }}"\n' +
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
    '        <md-button aria-label="DeleteAll" translate="xp-components.t.DeleteAll" ng-click="filters = []" ng-disabled="!filters.length"></md-button>\n' +
    '        <md-button aria-label="Cancel" translate="xp-components.t.Cancel" ng-click="cancel()"></md-button>\n' +
    '        <md-button aria-label="Apply" translate="xp-components.t.Apply" ng-click="apply(filters)"></md-button>\n' +
    '    </md-dialog-actions>\n' +
    '</md-dialog>');
}]);

module.exports = "/templates/xp-gridfilter-dialog.html";
},{}],11:[function(require,module,exports){
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
    '        <label translate="xp-components.t.From"></label>\n' +
    '        <md-input ng-model="filter.from"></md-input>\n' +
    '    </md-input-container>\n' +
    '    <md-input-container>\n' +
    '        <label translate="xp-components.t.To"></label>\n' +
    '        <md-input ng-model="filter.to"></md-input>\n' +
    '    </md-input-container>\n' +
    '</div>');
}]);

module.exports = "/templates/xp-gridfilter-number.html";
},{}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
'use strict';

module.exports = {
    'xp-components': {
        t: {
            Apply: 'Apply',
            Cancel: 'Cancel',
            ChooseAColumn: 'Choose a column',
            DeleteAll: 'Delete All',
            Filters: 'Filters',
            From: 'From',
            To: 'To'
        }
    }
};

},{}],14:[function(require,module,exports){
'use strict';

module.exports = {
    'xp-components': {
        t: {
            Apply: 'Appliquer',
            Cancel: 'Annuler',
            ChooseAColumn: 'Choisissez une colonne',
            DeleteAll: 'Supprimer tout',
            Filters: 'Filtres',
            From: 'De',
            To: 'À'
        }
    }
};

},{}],15:[function(require,module,exports){
'use strict';

module.exports = ['$translateProvider', function (translateProvider) {
    translateProvider.translations('en', require('./en')).translations('fr', require('./fr')).preferredLanguage('en');
}];

},{"./en":13,"./fr":14}],16:[function(require,module,exports){
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

angular.module('xp.components', ['ngMaterial', 'ngMdIcons', 'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.moveColumns', 'ui.grid.infiniteScroll', 'pascalprecht.translate'])

// directives
.directive('xpAutocomplete', require('./directives/xp-autocomplete')).directive('xpGrid', require('./directives/xp-grid')).directive('xpGridfilterButton', require('./directives/xp-gridfilter-button'))

// services  
.factory('xpGridfilterDialog', require('./services/xpGridfilterDialog'))

// templates
.run(require('./templates'))

// translations
.config(require('./translations'));

require('./utils/rx');

},{"./directives/xp-autocomplete":1,"./directives/xp-grid":2,"./directives/xp-gridfilter-button":3,"./services/xpGridfilterDialog":4,"./templates":5,"./translations":15,"./utils/rx":16}]},{},[17])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGRpcmVjdGl2ZXNcXHhwLWF1dG9jb21wbGV0ZS5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZC5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZGZpbHRlci1idXR0b24uanMiLCJzcmNcXHNlcnZpY2VzXFx4cEdyaWRmaWx0ZXJEaWFsb2cuanMiLCJzcmNcXHRlbXBsYXRlc1xcaW5kZXguanMiLCJzcmMvdGVtcGxhdGVzL3VpLWdyaWQtaGVhZGVyLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3VpLWdyaWQtcm93Lmh0bWwiLCJzcmMvdGVtcGxhdGVzL3VpR3JpZEhlYWRlckNlbGwuaHRtbCIsInNyYy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kYXRlLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGlhbG9nLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItbnVtYmVyLmh0bWwiLCJzcmMvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItc3RyaW5nLmh0bWwiLCJzcmNcXHRyYW5zbGF0aW9uc1xcZW4uanMiLCJzcmNcXHRyYW5zbGF0aW9uc1xcZnIuanMiLCJzcmNcXHRyYW5zbGF0aW9uc1xcaW5kZXguanMiLCJzcmNcXHV0aWxzXFxyeC5qcyIsInNyY1xcbGliLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQSxTQUFTLGdCQUFULENBQTBCLENBQTFCLEVBQTZCO0FBQ3pCLFdBQU8sQ0FBQyxLQUFLLEVBQU4sRUFBVSxXQUFWLEVBQVA7QUFDSDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsQ0FBQyxRQUFELEVBQVcsVUFBVSxNQUFWLEVBQWtCO0FBQzFDLFdBQU87QUFDSCxrQkFBVSxHQURQO0FBRUgsZUFBTztBQUNILHFCQUFTLElBRE47QUFFSCwwQkFBYyxJQUZYO0FBR0gsNEJBQWdCLElB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QUcsVUFBSCxDQUFjLFNBQWQsQ0FBd0IsTUFBeEIsR0FBaUMsVUFBVSxLQUFWLEVBQWlCLE9BQWpCLEVBQTBCO0FBQ3ZELFFBQUksT0FBTyxJQUFYO0FBQ0EsV0FBTyxJQUFJLEdBQUcsbUJBQVAsQ0FBMkIsVUFBVSxRQUFWLEVBQW9CO0FBQ2xELGVBQU8sS0FBSyxTQUFMLENBQ0gsVUFBVSxDQUFWLEVBQWE7QUFDVCxrQkFBTSxNQUFOLENBQWEsWUFBWTtBQUFFLHlCQUFTLE1BQVQsQ0FBZ0IsQ0FBaEI7QUFBcUIsYUFBaEQ7QUFDSCxTQUhFLEVBSUgsU0FBUyxPQUFULENBQWlCLElBQWpCLENBQXNCLFFBQXRCLENBSkcsRUFLSCxTQUFTLFdBQVQsQ0FBcUIsSUFBckIsQ0FBMEIsUUFBMUIsQ0FMRyxDQUFQO0FBT0gsS0FSTSxDQUFQO0FBU0gsQ0FYRDs7Ozs7QUNBQSxRQUNLLE1BREwsQ0FDWSxlQURaLEVBQzZCLENBQUMsWUFBRCxFQUFlLFdBQWYsRUFBNEIsU0FBNUIsRUFBdUMsdUJBQXZDLEVBQWdFLHFCQUFoRSxFQUF1Rix3QkFBdkYsRUFBaUgsd0JBQWpILENBRDdCOztBQUdJO0FBSEosQ0FJSyxTQUpMLENBSWUsZ0JBSmYsRUFJaUMsUUFBUSw4QkFBUixDQUpqQyxFQUtLLFNBTEwsQ0FLZSxRQUxmLEVBS3lCLFFBQVEsc0JBQVIsQ0FMekIsRUFNSyxTQU5MLENBTWUsb0JBTmYsRUFNcUMsUUFBUSxtQ0FBUixDQU5yQzs7QUFRSTtBQVJKLENBU0ssT0FUTCxDQVNhLG9CQVRiLEVBU21DLFFBQVEsK0JBQVIsQ0FUbkM7O0FBV0k7QUFYSixDQVlLLEdBWkwsQ0FZUyxRQUFRLGFBQVIsQ0FaVDs7QUFjSTtBQWRKLENBZUssTUFmTCxDQWVZLFFBQVEsZ0JBQVIsQ0FmWjs7QUFpQkEsUUFBUSxZQUFSIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIHNlYXJjaGFibGVTdHJpbmcoYSkge1xyXG4gICAgcmV0dXJuIChhIHx8ICcnKS50b0xvd2VyQ2FzZSgpOyAgICAgICAgXHJcbn1cclxuXHJcbi8vLyBleGFtcGxlXHJcbi8vL1xyXG4vLy8gICAgIDx4cC1hdXRvY29tcGxldGUgeHAtaXRlbXM9XCJpdGVtIGluIGl0ZW1zXCIgeHAtaXRlbS10ZXh0PVwiaXRlbS5kaXNwbGF5XCI+PC94cC1hdXRvY29tcGxldGU+XHJcbi8vL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBbJyRwYXJzZScsIGZ1bmN0aW9uICgkcGFyc2UpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZToge1xyXG4gICAgICAgICAgICB4cEl0ZW1zOiAnPT8nLFxyXG4gICAgICAgICAgICB4cFNlYXJjaFRleHQ6ICc9PycsXHJcbiAgICAgICAgICAgIHhwU2VsZWN0ZWRJdGVtOiAnPT8nLFxyXG4gICAgICAgICAgICB4cEZsb2F0aW5nTGFiZWw6ICdAJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVtcGxhdGU6IGZ1bmN0aW9uIChlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICByZXR1cm4gYDxtZC1hdXRvY29tcGxldGVcclxuICAgICAgICAgICAgICAgIG1kLWl0ZW1zPVwiaXRlbSBpbiBfaXRlbXNcIlxyXG4gICAgICAgICAgICAgICAgbWQtaXRlbS10ZXh0PVwiJHthdHRycy54cEl0ZW1UZXh0fVwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWFyY2gtdGV4dD1cInhwU2VhcmNoVGV4dFwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWFyY2gtdGV4dC1jaGFuZ2U9XCIke2F0dHJzLnhwU2VhcmNoVGV4dENoYW5nZX1cIlxyXG4gICAgICAgICAgICAgICAgbWQtc2VsZWN0ZWQtaXRlbT1cInhwU2VsZWN0ZWRJdGVtXCJcclxuICAgICAgICAgICAgICAgIG1kLXNlbGVjdGVkLWl0ZW0tY2hhbmdlPVwic2VsZWN0ZWRJdGVtQ2hhbmdlKHhwU2VsZWN0ZWRJdGVtKVwiXHJcbiAgICAgICAgICAgICAgICBtZC1taW4tbGVuZ3RoPVwiMFwiXHJcbiAgICAgICAgICAgICAgICBtZC1hdXRvc2VsZWN0PVwidHJ1ZVwiXHJcbiAgICAgICAgICAgICAgICBtZC1tYXRjaC1jYXNlLWluc2Vuc2l0aXZlPVwidHJ1ZVwiXHJcbiAgICAgICAgICAgICAgICBtZC1mbG9hdGluZy1sYWJlbD1cInt7eHBGbG9hdGluZ0xhYmVsfX1cIj5cclxuICAgICAgICAgICAgICAgICAgICA8bWQtaXRlbS10ZW1wbGF0ZT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gbWQtaGlnaGxpZ2h0LXRleHQ9XCJ4cFNlYXJjaFRleHRcIiBtZC1oaWdobGlnaHQtZmxhZ3M9XCJpXCI+e3ske2F0dHJzLnhwSXRlbVRleHR9fX08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9tZC1pdGVtLXRlbXBsYXRlPlxyXG4gICAgICAgICAgICA8L21kLWF1dG9jb21wbGV0ZT5gO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xyXG4gICAgICAgICAgICB2YXIgZ2V0SXRlbVRleHQgPSAkcGFyc2UoYXR0cnMueHBJdGVtVGV4dCk7XHJcbiAgICAgICAgICAgIHZhciBpdGVtcztcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLl9pdGVtcyA9IFtdO1xyXG4gICAgICAgICAgICBzY29wZS5fc2VhcmNoX3RleHQgPSAnJztcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkSXRlbUNoYW5nZSA9IGl0ZW0gPT4gc2NvcGUuJHBhcmVudC4kZXZhbChhdHRycy54cFNlbGVjdGVkSXRlbUNoYW5nZSwgeyBpdGVtIH0pO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGBbeHBJdGVtcyx4cFNlYXJjaFRleHRdYCwgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpdGVtcyA9IGVbMF0gfHwgW107XHJcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGVbMV0gfHwgJyc7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXJyYXkgPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICB0ZXh0ID0gc2VhcmNoYWJsZVN0cmluZyh0ZXh0KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGV4dCB8fCBzZWFyY2hhYmxlU3RyaW5nKGdldEl0ZW1UZXh0KHNjb3BlLCB7IGl0ZW06IGl0ZW1zW2ldIH0pKS5pbmRleE9mKHRleHQpICE9PSAtMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJyYXkucHVzaChpdGVtc1tpXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NvcGUuX2l0ZW1zID0gYXJyYXk7XHJcblxyXG4gICAgICAgICAgICB9LCB0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XTsiLCJtb2R1bGUuZXhwb3J0cyA9IFsnJHEnLCBmdW5jdGlvbiAoJHEpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcclxuICAgICAgICBzY29wZTogdHJ1ZSxcclxuICAgICAgICB0ZW1wbGF0ZTogYDxkaXYgbGF5b3V0PVwiY29sdW1uXCIgY2xhc3M9XCJ4cC1ncmlkXCI+XHJcbiAgICAgICAgICAgIDx4cC1ncmlkZmlsdGVyLWJ1dHRvbiB4cC1ncmlkLW9wdGlvbnM9XCJvcHRpb25zXCIgbGF5b3V0PVwicm93XCIgbGF5b3V0LWFsaWduPVwiZW5kIGNlbnRlclwiPjwveHAtZ3JpZGZpbHRlci1idXR0b24+XHJcbiAgICAgICAgICAgIDxkaXYgdWktZ3JpZD1cIm9wdGlvbnNcIiBmbGV4IHVpLWdyaWQtcmVzaXplLWNvbHVtbnMgdWktZ3JpZC1tb3ZlLWNvbHVtbnMgdWktZ3JpZC1pbmZpbml0ZS1zY3JvbGw+PC9kaXY+XHJcbiAgICAgICAgPC9kaXY+YCxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgc29ydDtcclxuICAgICAgICAgICAgdmFyIG11c3RSZWxvYWQ7XHJcbiAgICAgICAgICAgIHZhciBwYWdlID0gMDtcclxuICAgICAgICAgICAgdmFyIHJlZnJlc2ggPSBuZXcgUnguU3ViamVjdCgpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUub3B0aW9ucyA9IHNjb3BlLiRwYXJlbnQuJGV2YWwoYXR0cnMueHBHcmlkT3B0aW9ucyB8fCAne30nKSB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0gYW5ndWxhci5leHRlbmQoc2NvcGUub3B0aW9ucywge1xyXG4gICAgICAgICAgICAgICAgZGF0YTogW10sXHJcbiAgICAgICAgICAgICAgICBpbmZpbml0ZVNjcm9sbFJvd3NGcm9tRW5kOiAxMDAsXHJcbiAgICAgICAgICAgICAgICBpbmZpbml0ZVNjcm9sbERvd246IHRydWUsXHJcbiAgICAgICAgICAgICAgICBvblJlZ2lzdGVyQXBpOiBmdW5jdGlvbiAoZ3JpZEFwaSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLm9wdGlvbnMuZ3JpZEFwaSA9IGdyaWRBcGk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZEFwaS5jb3JlLm9uLnNvcnRDaGFuZ2VkKHNjb3BlLCBzb3J0Q2hhbmdlZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc29ydENoYW5nZWQoZ3JpZEFwaS5ncmlkLCBbb3B0aW9ucy5jb2x1bW5EZWZzWzFdXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZEFwaS5pbmZpbml0ZVNjcm9sbC5vbi5uZWVkTG9hZE1vcmVEYXRhKHNjb3BlLCBuZWVkTG9hZE1vcmVEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goJ29wdGlvbnMuY29sdW1uRGVmcycsIGNvbHVtbnMgPT4gc2NvcGUuZmlsdGVycyA9IGNvbXB1dGVGaWx0ZXJzKGNvbHVtbnMpLCB0cnVlKTtcclxuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKCdmaWx0ZXJzJywgXyA9PiByZWZyZXNoLm9uTmV4dCh0cnVlKSwgdHJ1ZSk7IFxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gbmVlZExvYWRNb3JlRGF0YSgpIHtcclxuICAgICAgICAgICAgICAgIHJlZnJlc2gub25OZXh0KGZhbHNlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gc29ydENoYW5nZWQoZ3JpZCwgc29ydENvbHVtbnMpIHtcclxuICAgICAgICAgICAgICAgIHNvcnQgPSBjb21wdXRlU29ydFN0cmluZyhzb3J0Q29sdW1ucyk7XHJcbiAgICAgICAgICAgICAgICByZWZyZXNoLm9uTmV4dCh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVmcmVzaFxyXG4gICAgICAgICAgICAgICAgLm1hcChlID0+IG11c3RSZWxvYWQgfD0gZSlcclxuICAgICAgICAgICAgICAgIC5kZWJvdW5jZSgxKVxyXG4gICAgICAgICAgICAgICAgLiRhcHBseShzY29wZSlcclxuICAgICAgICAgICAgICAgIC5mbGF0TWFwTGF0ZXN0KGZ1bmN0aW9uIChyZWxvYWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBtdXN0UmVsb2FkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWxvYWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFnZSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmRhdGEgPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSBhbmd1bGFyLmV4dGVuZCh7IHBhZ2UsIHNvcnQsIHBhZ2VTaXplOiAxMDAgfSwgc2NvcGUuZmlsdGVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG9wdGlvbnMuZmV0Y2gocGFyYW1zKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQuc3Vic2NyaWJlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBSeC5PYnNlcnZhYmxlLmZyb21Qcm9taXNlKCRxLndoZW4ocmVzdWx0KSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQuY2F0Y2goXyA9PiBSeC5PYnNlcnZhYmxlLmVtcHR5KCkpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC4kYXBwbHkoc2NvcGUpXHJcbiAgICAgICAgICAgICAgICAudGFwKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFnZSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YSA9IG9wdGlvbnMuZGF0YS5jb25jYXQoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUub3B0aW9ucy5ncmlkQXBpLmluZmluaXRlU2Nyb2xsLmRhdGFMb2FkZWQoZmFsc2UsIGRhdGEubGVuZ3RoID49IDEwMCk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnN1YnNjcmliZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufV07XHJcblxyXG5mdW5jdGlvbiBjb21wdXRlRmlsdGVycyhjb2x1bW5zKSB7XHJcbiAgICB2YXIgbyA9IHt9O1xyXG5cclxuICAgIGlmIChjb2x1bW5zKVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgY29sdW1uID0gY29sdW1uc1tpXTtcclxuICAgICAgICAgICAgdmFyIGZpbHRlcnMgPSBjb2x1bW4uZmlsdGVycyB8fCBbXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChmaWx0ZXJzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgIG9bY29sdW1uLm5hbWVdID0gZmlsdGVycztcclxuICAgICAgICB9XHJcblxyXG4gICAgcmV0dXJuIG87XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbXB1dGVTb3J0U3RyaW5nKHNvcnRDb2x1bW5zKSB7XHJcbiAgICB2YXIgcyA9ICcnO1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc29ydENvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAocykgcyArPSAnLCc7XHJcblxyXG4gICAgICAgIHZhciBjb2wgPSBzb3J0Q29sdW1uc1tpXTtcclxuICAgICAgICBpZiAoY29sLnNvcnQpXHJcbiAgICAgICAgICAgIHMgKz0gY29sLm5hbWUgKyAnOicgKyBjb2wuc29ydC5kaXJlY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHM7XHJcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IFsneHBHcmlkZmlsdGVyRGlhbG9nJywgJyRwYXJzZScsIGZ1bmN0aW9uICh4cEdyaWRmaWx0ZXJEaWFsb2csIHBhcnNlKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHNjb3BlOiB0cnVlLFxyXG4gICAgICAgIHRlbXBsYXRlOiBgPG1kLWJ1dHRvbiBhcmlhLWxhYmVsPVwiRmlsdGVyXCIgbmctY2xpY2s9XCJzaG93RGlhbG9nKClcIiBuZy1jbGFzcz1cInsnbWQtcHJpbWFyeSc6IGZpbHRlcmVkKCl9XCI+XHJcbiAgICAgICAgICAgIDxuZy1tZC1pY29uIGljb249XCJmaWx0ZXJfbGlzdFwiPjwvbmctbWQtaWNvbj5cclxuICAgICAgICA8L21kLWJ1dHRvbj5gLFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBwYXJzZShhdHRycy54cEdyaWRPcHRpb25zKTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLmZpbHRlcmVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHsgY29sdW1uRGVmcyB9ID0gb3B0aW9ucyhzY29wZSkgfHwgMDtcclxuICAgICAgICAgICAgICAgIGlmIChjb2x1bW5EZWZzKVxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1uRGVmcy5sZW5ndGg7IGkrKylcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbHVtbkRlZnNbaV0uZmlsdGVycyAmJiBjb2x1bW5EZWZzW2ldLmZpbHRlcnMubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS5zaG93RGlhbG9nID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGdyaWRPcHRpb25zID0gb3B0aW9ucyhzY29wZSkgfHwge307XHJcbiAgICAgICAgICAgICAgICB4cEdyaWRmaWx0ZXJEaWFsb2coeyBncmlkT3B0aW9ucyB9KTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XTsiLCJmdW5jdGlvbiBjb2x1bW5zQ29tcGFyZXIoYSwgYikge1xyXG4gICAgcmV0dXJuIGEuZGlzcGxheU5hbWUgPCBiLmRpc3BsYXlOYW1lID8gLTEgOiBhLmRpc3BsYXlOYW1lID4gYi5kaXNwbGF5TmFtZSA/IDEgOiAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkRmlsdGVycyhjb2x1bW5zKSB7XHJcbiAgICB2YXIgcmVzdWx0ID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2x1bW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGNvbHVtbiA9IGNvbHVtbnNbaV07XHJcbiAgICAgICAgdmFyIGZpbHRlcnMgPSBhbmd1bGFyLmNvcHkoY29sdW1uLmZpbHRlcnMgfHwgW10pO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGZpbHRlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgdmFyIGZpbHRlciA9IGZpbHRlcnNbal07XHJcbiAgICAgICAgICAgIGZpbHRlci5jb2x1bW4gPSBjb2x1bW47XHJcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZpbHRlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNhdmVGaWx0ZXJzKGNvbHVtbnMsIGZpbHRlcnMpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1ucy5sZW5ndGg7IGkrKylcclxuICAgICAgICBjb2x1bW5zW2ldLmZpbHRlcnMgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbHRlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgZmlsdGVyID0gZmlsdGVyc1tpXTtcclxuICAgICAgICBmaWx0ZXIuY29sdW1uLmZpbHRlcnMucHVzaChmaWx0ZXIpO1xyXG4gICAgICAgIGRlbGV0ZSBmaWx0ZXIuY29sdW1uO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFsnJG1kRGlhbG9nJywgJyR0aW1lb3V0JywgZnVuY3Rpb24gKCRtZERpYWxvZywgJHRpbWVvdXQpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAob3B0aW9ucykge1xyXG4gICAgICAgIHZhciB7IGdyaWRPcHRpb25zIH0gPSBvcHRpb25zO1xyXG5cclxuICAgICAgICB2YXIgZGlhbG9nID0ge1xyXG4gICAgICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxyXG4gICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOiB0cnVlLFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckbWREaWFsb2cnLCBmdW5jdGlvbiAoc2NvcGUsICRtZERpYWxvZykge1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSBncmlkT3B0aW9ucy5jb2x1bW5EZWZzLnNsaWNlKCkuc29ydChjb2x1bW5zQ29tcGFyZXIpO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuZmlsdGVycyA9IGxvYWRGaWx0ZXJzKHNjb3BlLmNvbHVtbnMpO1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmFwcGx5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2F2ZUZpbHRlcnMoc2NvcGUuY29sdW1ucywgc2NvcGUuZmlsdGVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgJG1kRGlhbG9nLmhpZGUodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5jYW5jZWwgPSBfID0+ICRtZERpYWxvZy5jYW5jZWwoKTtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmF1dG9Db21wbGV0ZVRleHQgPSAnJztcclxuICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkQ29sdW1uID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5yZW1vdmVGaWx0ZXIgPSBmdW5jdGlvbiAoZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gc2NvcGUuZmlsdGVycy5pbmRleE9mKGZpbHRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsdGVycy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB3aGVuIGEgY29sdW1uIGlzIHNlbGVjdGVkIGluIHRoZSBhdXRvY29tcGxldGVcclxuICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkQ29sdW1uQ2hhbmdlZCA9IGZ1bmN0aW9uIChzZWxlY3RlZENvbHVtbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc2VsZWN0ZWRDb2x1bW4pIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGNvbHVtbnMgdG8gdGhlIGxpc3Qgb2YgZmlsdGVycyBmb3IgZWRpdGluZy5cclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5maWx0ZXJzLnVuc2hpZnQoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHNlbGVjdGVkQ29sdW1uXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2xlYXIgdGhlIGF1dG9jb21wbGV0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5hdXRvQ29tcGxldGVUZXh0ID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkQ29sdW1uID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy54cC1ncmlkZmlsdGVyLWl0ZW0gaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1dLFxyXG4gICAgICAgICAgICBlc2NhcGVUb0Nsb3NlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kaWFsb2cuaHRtbCdcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gJG1kRGlhbG9nLnNob3coZGlhbG9nKTtcclxuICAgIH07XHJcbn1dOyIsInJlcXVpcmUoJy4veHAtZ3JpZGZpbHRlci1kYXRlLmh0bWwnKTtcclxucmVxdWlyZSgnLi94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sJyk7XHJcbnJlcXVpcmUoJy4veHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbCcpO1xyXG5yZXF1aXJlKCcuL3hwLWdyaWRmaWx0ZXItc3RyaW5nLmh0bWwnKTtcclxuXHJcbnZhciB1aUdyaWRIZWFkZXJDZWxsID0gcmVxdWlyZSgnLi91aUdyaWRIZWFkZXJDZWxsLmh0bWwnKTtcclxudmFyIHVpR3JpZFJvdyA9IHJlcXVpcmUoJy4vdWktZ3JpZC1yb3cuaHRtbCcpO1xyXG52YXIgdWlHcmlkSGVhZGVyID0gcmVxdWlyZSgnLi91aS1ncmlkLWhlYWRlci5odG1sJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgLy9SZXBsYWNlIHVpLWdyaWQgdGVtcGxhdGVzIFxyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd1aS1ncmlkL3VpR3JpZEhlYWRlckNlbGwnLCAkdGVtcGxhdGVDYWNoZS5nZXQodWlHcmlkSGVhZGVyQ2VsbCkpO1xyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd1aS1ncmlkL3VpLWdyaWQtcm93JywgJHRlbXBsYXRlQ2FjaGUuZ2V0KHVpR3JpZFJvdykpO1xyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd1aS1ncmlkL3VpLWdyaWQtaGVhZGVyJywgJHRlbXBsYXRlQ2FjaGUuZ2V0KHVpR3JpZEhlYWRlcikpO1xyXG59XTsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy91aS1ncmlkLWhlYWRlci5odG1sJyxcbiAgICAnPGRpdlxcbicgK1xuICAgICcgIHJvbGU9XCJyb3dncm91cFwiXFxuJyArXG4gICAgJyAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlclwiPiA8IS0tIHRoZWFkZXIgLS0+XFxuJyArXG4gICAgJyAgPGRpdlxcbicgK1xuICAgICcgICAgY2xhc3M9XCJ1aS1ncmlkLXRvcC1wYW5lbFwiPlxcbicgK1xuICAgICcgICAgPGRpdlxcbicgK1xuICAgICcgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLXZpZXdwb3J0XCI+XFxuJyArXG4gICAgJyAgICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNhbnZhc1wiPlxcbicgK1xuICAgICcgICAgICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2VsbC13cmFwcGVyXCJcXG4nICtcbiAgICAnICAgICAgICAgIG5nLXN0eWxlPVwiY29sQ29udGFpbmVyLmhlYWRlckNlbGxXcmFwcGVyU3R5bGUoKVwiPlxcbicgK1xuICAgICcgICAgICAgICAgPGRpdlxcbicgK1xuICAgICcgICAgICAgICAgICByb2xlPVwicm93XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jZWxsLXJvd1wiPlxcbicgK1xuICAgICcgICAgICAgICAgICA8ZGl2XFxuJyArXG4gICAgJyAgICAgICAgICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jZWxsIHVpLWdyaWQtY2xlYXJmaXhcIlxcbicgK1xuICAgICcgICAgICAgICAgICAgIG5nLXJlcGVhdD1cImNvbCBpbiBjb2xDb250YWluZXIucmVuZGVyZWRDb2x1bW5zIHRyYWNrIGJ5IGNvbC51aWRcIlxcbicgK1xuICAgICcgICAgICAgICAgICAgIHVpLWdyaWQtaGVhZGVyLWNlbGxcXG4nICtcbiAgICAnICAgICAgICAgICAgICBtZC1jb2xvcnM9XCI6OntiYWNrZ3JvdW5kOiBcXCdiYWNrZ3JvdW5kXFwnfVwiXFxuJyArXG4gICAgJyAgICAgICAgICAgICAgY29sPVwiY29sXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgICByZW5kZXItaW5kZXg9XCIkaW5kZXhcIj5cXG4nICtcbiAgICAnICAgICAgICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICAgICAgICA8L2Rpdj5cXG4nICtcbiAgICAnICAgICAgICA8L2Rpdj5cXG4nICtcbiAgICAnICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICA8L2Rpdj5cXG4nICtcbiAgICAnICA8L2Rpdj5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3VpLWdyaWQtaGVhZGVyLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy91aS1ncmlkLXJvdy5odG1sJyxcbiAgICAnPGRpdiBuZy1yZXBlYXQ9XCIoY29sUmVuZGVySW5kZXgsIGNvbCkgaW4gY29sQ29udGFpbmVyLnJlbmRlcmVkQ29sdW1ucyB0cmFjayBieSBjb2wudWlkXCIgdWktZ3JpZC1vbmUtYmluZC1pZC1ncmlkPVwicm93UmVuZGVySW5kZXggKyBcXCctXFwnICsgY29sLnVpZCArIFxcJy1jZWxsXFwnXCJcXG4nICtcbiAgICAnICAgIGNsYXNzPVwidWktZ3JpZC1jZWxsXCIgbmctY2xhc3M9XCJ7IFxcJ3VpLWdyaWQtcm93LWhlYWRlci1jZWxsXFwnOiBjb2wuaXNSb3dIZWFkZXIgfVwiIG1kLWNvbG9ycz1cIjo6e2JhY2tncm91bmQ6IFxcJ2JhY2tncm91bmQtaHVlLVxcJyArIChyb3dSZW5kZXJJbmRleCAlIDIgKyAxKX1cIiByb2xlPVwie3tjb2wuaXNSb3dIZWFkZXIgPyBcXCdyb3doZWFkZXJcXCcgOiBcXCdncmlkY2VsbFxcJ319XCJcXG4nICtcbiAgICAnICAgIHVpLWdyaWQtY2VsbD5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3VpLWdyaWQtcm93Lmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy91aUdyaWRIZWFkZXJDZWxsLmh0bWwnLFxuICAgICc8ZGl2XFxuJyArXG4gICAgJyAgcm9sZT1cImNvbHVtbmhlYWRlclwiXFxuJyArXG4gICAgJyAgbmctY2xhc3M9XCJ7IFxcJ3NvcnRhYmxlXFwnOiBzb3J0YWJsZSB9XCJcXG4nICtcbiAgICAnICB1aS1ncmlkLW9uZS1iaW5kLWFyaWEtbGFiZWxsZWRieS1ncmlkPVwiY29sLnVpZCArIFxcJy1oZWFkZXItdGV4dCBcXCcgKyBjb2wudWlkICsgXFwnLXNvcnRkaXItdGV4dFxcJ1wiXFxuJyArXG4gICAgJyAgYXJpYS1zb3J0PVwie3tjb2wuc29ydC5kaXJlY3Rpb24gPT0gYXNjID8gXFwnYXNjZW5kaW5nXFwnIDogKCBjb2wuc29ydC5kaXJlY3Rpb24gPT0gZGVzYyA/IFxcJ2Rlc2NlbmRpbmdcXCcgOiAoIWNvbC5zb3J0LmRpcmVjdGlvbiA/IFxcJ25vbmVcXCcgOiBcXCdvdGhlclxcJykpfX1cIj5cXG4nICtcbiAgICAnICA8bWQtYnV0dG9uXFxuJyArXG4gICAgJyAgICByb2xlPVwiYnV0dG9uXCJcXG4nICtcbiAgICAnICAgIHRhYmluZGV4PVwiMFwiXFxuJyArXG4gICAgJyAgICBjbGFzcz1cInVpLWdyaWQtY2VsbC1jb250ZW50cyB1aS1ncmlkLWhlYWRlci1jZWxsLXByaW1hcnktZm9jdXNcIlxcbicgK1xuICAgICcgICAgY29sLWluZGV4PVwicmVuZGVySW5kZXhcIlxcbicgK1xuICAgICcgICAgdGl0bGU9XCJUT09MVElQXCI+XFxuJyArXG4gICAgJyAgICA8c3BhblxcbicgK1xuICAgICcgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNlbGwtbGFiZWxcIlxcbicgK1xuICAgICcgICAgICB1aS1ncmlkLW9uZS1iaW5kLWlkLWdyaWQ9XCJjb2wudWlkICsgXFwnLWhlYWRlci10ZXh0XFwnXCI+XFxuJyArXG4gICAgJyAgICAgIHt7IGNvbC5kaXNwbGF5TmFtZSBDVVNUT01fRklMVEVSUyB9fVxcbicgK1xuICAgICcgICAgPC9zcGFuPlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICAgIDxzcGFuXFxuJyArXG4gICAgJyAgICAgIHVpLWdyaWQtb25lLWJpbmQtaWQtZ3JpZD1cImNvbC51aWQgKyBcXCctc29ydGRpci10ZXh0XFwnXCJcXG4nICtcbiAgICAnICAgICAgdWktZ3JpZC12aXNpYmxlPVwiY29sLnNvcnQuZGlyZWN0aW9uXCJcXG4nICtcbiAgICAnICAgICAgYXJpYS1sYWJlbD1cInt7Z2V0U29ydERpcmVjdGlvbkFyaWFMYWJlbCgpfX1cIj5cXG4nICtcbiAgICAnICAgICAgPGlcXG4nICtcbiAgICAnICAgICAgIG5nLWNsYXNzPVwieyBcXCd1aS1ncmlkLWljb24tdXAtZGlyXFwnOiBjb2wuc29ydC5kaXJlY3Rpb24gPT0gYXNjLCBcXCd1aS1ncmlkLWljb24tZG93bi1kaXJcXCc6IGNvbC5zb3J0LmRpcmVjdGlvbiA9PSBkZXNjLCBcXCd1aS1ncmlkLWljb24tYmxhbmtcXCc6ICFjb2wuc29ydC5kaXJlY3Rpb24gfVwiXFxuJyArXG4gICAgJyAgICAgICB0aXRsZT1cInt7aXNTb3J0UHJpb3JpdHlWaXNpYmxlKCkgPyBpMThuLmhlYWRlckNlbGwucHJpb3JpdHkgKyBcXCcgXFwnICsgKCBjb2wuc29ydC5wcmlvcml0eSArIDEgKSAgOiBudWxsfX1cIlxcbicgK1xuICAgICcgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XFxuJyArXG4gICAgJyAgICAgPC9pPlxcbicgK1xuICAgICcgICAgIDxzdWJcXG4nICtcbiAgICAnICAgICAgIHVpLWdyaWQtdmlzaWJsZT1cImlzU29ydFByaW9yaXR5VmlzaWJsZSgpXCJcXG4nICtcbiAgICAnICAgICAgIGNsYXNzPVwidWktZ3JpZC1zb3J0LXByaW9yaXR5LW51bWJlclwiPlxcbicgK1xuICAgICcgICAgICAge3tjb2wuc29ydC5wcmlvcml0eSArIDF9fVxcbicgK1xuICAgICcgICAgIDwvc3ViPlxcbicgK1xuICAgICcgICAgPC9zcGFuPlxcbicgK1xuICAgICcgIDwvbWQtYnV0dG9uPlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICA8ZGl2IHVpLWdyaWQtZmlsdGVyPjwvZGl2PlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMvdWlHcmlkSGVhZGVyQ2VsbC5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kYXRlLmh0bWwnLFxuICAgICc8ZGl2IGxheW91dD1cInJvd1wiIGxheW91dC1hbGlnbj1cImNlbnRlciBjZW50ZXJcIj5cXG4nICtcbiAgICAnICAgIDxsYWJlbCBuZy1iaW5kPVwiZmlsdGVyLmNvbHVtbi5kaXNwbGF5TmFtZVwiPjwvbGFiZWw+XFxuJyArXG4gICAgJyAgICA8bWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgICAgIDxsYWJlbCB0cmFuc2xhdGU9XCJ4cC1jb21wb25lbnRzLnQuRnJvbVwiPjwvbGFiZWw+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWRhdGVwaWNrZXIgbmctbW9kZWw9XCJmaWx0ZXIuZnJvbVwiIG5nLWNoYW5nZT1cImZpbHRlci50byA9IGZpbHRlci5mcm9tICYmIGZpbHRlci50byAmJiBmaWx0ZXIudG8gPCBmaWx0ZXIuZnJvbSA/IGZpbHRlci5mcm9tIDogZmlsdGVyLnRvXCI+PC9tZC1kYXRlcGlja2VyPlxcbicgK1xuICAgICcgICAgPC9tZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICA8bWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgICAgIDxsYWJlbCB0cmFuc2xhdGU9XCJ4cC1jb21wb25lbnRzLnQuVG9cIj48L2xhYmVsPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1kYXRlcGlja2VyIG5nLW1vZGVsPVwiZmlsdGVyLnRvXCIgbmctY2hhbmdlPVwiZmlsdGVyLmZyb20gPSBmaWx0ZXIuZnJvbSAmJiBmaWx0ZXIudG8gJiYgZmlsdGVyLmZyb20gPiBmaWx0ZXIudG8gPyBmaWx0ZXIudG8gOiBmaWx0ZXIuZnJvbVwiPjwvbWQtZGF0ZXBpY2tlcj5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kYXRlLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sJyxcbiAgICAnPG1kLWRpYWxvZyBjbGFzcz1cInhwLWdyaWRmaWx0ZXJcIiBhcmlhLWxhYmVsPVwiR3JpZEZpbHRlclwiIGxheW91dC1wYWRkaW5nPlxcbicgK1xuICAgICcgICAgPGRpdiBjbGFzcz1cImRpYWxvZ0hlYWRlclwiIGZsZXg9XCJhdXRvXCI+XFxuJyArXG4gICAgJyAgICAgICAgPHNwYW4+e3tcXCd4cC1jb21wb25lbnRzLnQuRmlsdGVyc1xcJyB8IHRyYW5zbGF0ZSB9fTwvc3Bhbj5cXG4nICtcbiAgICAnXFxuJyArXG4gICAgJyAgICAgICAgPHhwLWF1dG9jb21wbGV0ZVxcbicgK1xuICAgICcgICAgICAgICAgICB4cC1mbG9hdGluZy1sYWJlbD1cInt7IFxcJ3hwLWNvbXBvbmVudHMudC5DaG9vc2VBQ29sdW1uXFwnIHwgdHJhbnNsYXRlIH19XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtaXRlbXM9XCJjb2x1bW5zXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtaXRlbS10ZXh0PVwiaXRlbS5kaXNwbGF5TmFtZVwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLXNlYXJjaC10ZXh0PVwiYXV0b0NvbXBsZXRlVGV4dFwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLXNlbGVjdGVkLWl0ZW09XCJzZWxlY3RlZENvbHVtblwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLXNlbGVjdGVkLWl0ZW0tY2hhbmdlPVwic2VsZWN0ZWRDb2x1bW5DaGFuZ2VkKGl0ZW0pXCIvPlxcbicgK1xuICAgICcgICAgPC9kaXY+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgICAgPG1kLWRpYWxvZy1jb250ZW50IGZsZXg9XCIxMDBcIj5cXG4nICtcbiAgICAnICAgICAgICA8bWQtbGlzdD5cXG4nICtcbiAgICAnICAgICAgICAgICAgPG1kLWxpc3QtaXRlbSBjbGFzcz1cInNlY29uZGFyeS1idXR0b24tcGFkZGluZyB4cC1ncmlkZmlsdGVyLWl0ZW1cIiBuZy1yZXBlYXQ9XCJmaWx0ZXIgaW4gZmlsdGVyc1wiPlxcbicgK1xuICAgICcgICAgICAgICAgICAgICAgPG5nLWluY2x1ZGUgZmxleD1cImF1dG9cIiBzcmM9XCJcXCcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItXFwnICsgKGZpbHRlci5jb2x1bW4uZmlsdGVyVHlwZSB8fCBcXCdzdHJpbmdcXCcpICsgXFwnLmh0bWxcXCdcIj48L25nLWluY2x1ZGU+XFxuJyArXG4gICAgJyAgICAgICAgICAgICAgICA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJSZW1vdmVGaWx0ZXJcIiBjbGFzcz1cIm1kLXNlY29uZGFyeVwiIG5nLWNsaWNrPVwicmVtb3ZlRmlsdGVyKGZpbHRlcilcIj48bmctbWQtaWNvbiBpY29uPVwiZGVsZXRlXCI+PC9uZy1tZC1pY29uPjwvbWQtYnV0dG9uPlxcbicgK1xuICAgICcgICAgICAgICAgICA8L21kLWxpc3QtaXRlbT5cXG4nICtcbiAgICAnICAgICAgICA8L21kLWxpc3Q+XFxuJyArXG4gICAgJyAgICA8L21kLWRpYWxvZy1jb250ZW50PlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICAgIDxtZC1kaWFsb2ctYWN0aW9ucyBmbGV4PVwiYXV0b1wiPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIkRlbGV0ZUFsbFwiIHRyYW5zbGF0ZT1cInhwLWNvbXBvbmVudHMudC5EZWxldGVBbGxcIiBuZy1jbGljaz1cImZpbHRlcnMgPSBbXVwiIG5nLWRpc2FibGVkPVwiIWZpbHRlcnMubGVuZ3RoXCI+PC9tZC1idXR0b24+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWJ1dHRvbiBhcmlhLWxhYmVsPVwiQ2FuY2VsXCIgdHJhbnNsYXRlPVwieHAtY29tcG9uZW50cy50LkNhbmNlbFwiIG5nLWNsaWNrPVwiY2FuY2VsKClcIj48L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnICAgICAgICA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJBcHBseVwiIHRyYW5zbGF0ZT1cInhwLWNvbXBvbmVudHMudC5BcHBseVwiIG5nLWNsaWNrPVwiYXBwbHkoZmlsdGVycylcIj48L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnICAgIDwvbWQtZGlhbG9nLWFjdGlvbnM+XFxuJyArXG4gICAgJzwvbWQtZGlhbG9nPicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbCcsXG4gICAgJzxkaXYgbGF5b3V0PVwicm93XCIgbGF5b3V0LWFsaWduPVwiY2VudGVyIGNlbnRlclwiPlxcbicgK1xuICAgICcgICAgPGxhYmVsIG5nLWJpbmQ9XCJmaWx0ZXIuY29sdW1uLmRpc3BsYXlOYW1lXCI+PC9sYWJlbD5cXG4nICtcbiAgICAnICAgIDxtZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICAgICAgPGxhYmVsIHRyYW5zbGF0ZT1cInhwLWNvbXBvbmVudHMudC5Gcm9tXCI+PC9sYWJlbD5cXG4nICtcbiAgICAnICAgICAgICA8bWQtaW5wdXQgbmctbW9kZWw9XCJmaWx0ZXIuZnJvbVwiPjwvbWQtaW5wdXQ+XFxuJyArXG4gICAgJyAgICA8L21kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgIDxtZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICAgICAgPGxhYmVsIHRyYW5zbGF0ZT1cInhwLWNvbXBvbmVudHMudC5Ub1wiPjwvbGFiZWw+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWlucHV0IG5nLW1vZGVsPVwiZmlsdGVyLnRvXCI+PC9tZC1pbnB1dD5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbFwiOyIsInZhciBuZ01vZHVsZTtcbnRyeSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnKTtcbn0gY2F0Y2ggKGUpIHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycsIFtdKTtcbn1cblxubmdNb2R1bGUucnVuKFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUpIHtcbiAgJHRlbXBsYXRlQ2FjaGUucHV0KCcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItc3RyaW5nLmh0bWwnLFxuICAgICc8bWQtaW5wdXQtY29udGFpbmVyIGNsYXNzPVwibWQtYmxvY2tcIj5cXG4nICtcbiAgICAnICA8bGFiZWwgbmctYmluZD1cImZpbHRlci5jb2x1bW4uZGlzcGxheU5hbWVcIj48L2xhYmVsPlxcbicgK1xuICAgICcgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5nLW1vZGVsPVwiZmlsdGVyLnZhbHVlXCIgcmVxdWlyZWQ+XFxuJyArXG4gICAgJzwvbWQtaW5wdXQtY29udGFpbmVyPicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sXCI7IiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICAneHAtY29tcG9uZW50cyc6IHtcclxuICAgICAgICB0OiB7XHJcbiAgICAgICAgICAgIEFwcGx5OiAnQXBwbHknLFxyXG4gICAgICAgICAgICBDYW5jZWw6ICdDYW5jZWwnLFxyXG4gICAgICAgICAgICBDaG9vc2VBQ29sdW1uOiAnQ2hvb3NlIGEgY29sdW1uJyxcclxuICAgICAgICAgICAgRGVsZXRlQWxsOiAnRGVsZXRlIEFsbCcsXHJcbiAgICAgICAgICAgIEZpbHRlcnM6ICdGaWx0ZXJzJyxcclxuICAgICAgICAgICAgRnJvbTogJ0Zyb20nLFxyXG4gICAgICAgICAgICBUbzogJ1RvJ1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgICd4cC1jb21wb25lbnRzJzoge1xyXG4gICAgICAgIHQ6IHtcclxuICAgICAgICAgICAgQXBwbHk6ICdBcHBsaXF1ZXInLFxyXG4gICAgICAgICAgICBDYW5jZWw6ICdBbm51bGVyJyxcclxuICAgICAgICAgICAgQ2hvb3NlQUNvbHVtbjogJ0Nob2lzaXNzZXogdW5lIGNvbG9ubmUnLFxyXG4gICAgICAgICAgICBEZWxldGVBbGw6ICdTdXBwcmltZXIgdG91dCcsXHJcbiAgICAgICAgICAgIEZpbHRlcnM6ICdGaWx0cmVzJyxcclxuICAgICAgICAgICAgRnJvbTogJ0RlJyxcclxuICAgICAgICAgICAgVG86ICfDgCdcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBbJyR0cmFuc2xhdGVQcm92aWRlcicsIGZ1bmN0aW9uICh0cmFuc2xhdGVQcm92aWRlcikge1xyXG4gICAgdHJhbnNsYXRlUHJvdmlkZXJcclxuICAgICAgICAudHJhbnNsYXRpb25zKCdlbicsIHJlcXVpcmUoJy4vZW4nKSlcclxuICAgICAgICAudHJhbnNsYXRpb25zKCdmcicsIHJlcXVpcmUoJy4vZnInKSlcclxuICAgICAgICAucHJlZmVycmVkTGFuZ3VhZ2UoJ2VuJyk7XHJcbn1dOyIsIlJ4Lk9ic2VydmFibGUucHJvdG90eXBlLiRhcHBseSA9IGZ1bmN0aW9uIChzY29wZSwgdGhpc0FyZykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgcmV0dXJuIG5ldyBSeC5Bbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvYnNlcnZlcikge1xyXG4gICAgICAgIHJldHVybiBzZWxmLnN1YnNjcmliZShcclxuICAgICAgICAgICAgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7IG9ic2VydmVyLm9uTmV4dChlKTsgfSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IuYmluZChvYnNlcnZlciksXHJcbiAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXHJcbiAgICAgICAgKTtcclxuICAgIH0pO1xyXG59OyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbJ25nTWF0ZXJpYWwnLCAnbmdNZEljb25zJywgJ3VpLmdyaWQnLCAndWkuZ3JpZC5yZXNpemVDb2x1bW5zJywgJ3VpLmdyaWQubW92ZUNvbHVtbnMnLCAndWkuZ3JpZC5pbmZpbml0ZVNjcm9sbCcsICdwYXNjYWxwcmVjaHQudHJhbnNsYXRlJ10pXHJcblxyXG4gICAgLy8gZGlyZWN0aXZlc1xyXG4gICAgLmRpcmVjdGl2ZSgneHBBdXRvY29tcGxldGUnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMveHAtYXV0b2NvbXBsZXRlJykpXHJcbiAgICAuZGlyZWN0aXZlKCd4cEdyaWQnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMveHAtZ3JpZCcpKVxyXG4gICAgLmRpcmVjdGl2ZSgneHBHcmlkZmlsdGVyQnV0dG9uJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3hwLWdyaWRmaWx0ZXItYnV0dG9uJykpXHJcblxyXG4gICAgLy8gc2VydmljZXMgIFxyXG4gICAgLmZhY3RvcnkoJ3hwR3JpZGZpbHRlckRpYWxvZycsIHJlcXVpcmUoJy4vc2VydmljZXMveHBHcmlkZmlsdGVyRGlhbG9nJykpXHJcblxyXG4gICAgLy8gdGVtcGxhdGVzXHJcbiAgICAucnVuKHJlcXVpcmUoJy4vdGVtcGxhdGVzJykpXHJcblxyXG4gICAgLy8gdHJhbnNsYXRpb25zXHJcbiAgICAuY29uZmlnKHJlcXVpcmUoJy4vdHJhbnNsYXRpb25zJykpO1xyXG5cclxucmVxdWlyZSgnLi91dGlscy9yeCcpO1xyXG4iXX0=
