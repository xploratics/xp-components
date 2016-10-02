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
    return function xpComponentTranslate(value) {
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
.filter('xpComponentTranslate', require('./filters/xpComponentTranslate'))

// services  
.factory('xpGridfilterDialog', require('./services/xpGridfilterDialog')).factory('xpComponentsTranslateService', require('./services/xpComponentsTranslateService'))

// templates
.run(require('./templates'));

require('./utils/rx');

},{"./directives/xp-autocomplete":1,"./directives/xp-grid":2,"./directives/xp-gridfilter-button":3,"./filters/xpComponentTranslate":4,"./services/xpComponentsTranslateService":5,"./services/xpGridfilterDialog":6,"./templates":7,"./utils/rx":15}]},{},[16])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGRpcmVjdGl2ZXNcXHhwLWF1dG9jb21wbGV0ZS5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZC5qcyIsInNyY1xcZGlyZWN0aXZlc1xceHAtZ3JpZGZpbHRlci1idXR0b24uanMiLCJzcmNcXGZpbHRlcnNcXHhwQ29tcG9uZW50VHJhbnNsYXRlLmpzIiwic3JjXFxzZXJ2aWNlc1xceHBDb21wb25lbnRzVHJhbnNsYXRlU2VydmljZS5qcyIsInNyY1xcc2VydmljZXNcXHhwR3JpZGZpbHRlckRpYWxvZy5qcyIsInNyY1xcdGVtcGxhdGVzXFxpbmRleC5qcyIsInNyYy90ZW1wbGF0ZXMvdWktZ3JpZC1oZWFkZXIuaHRtbCIsInNyYy90ZW1wbGF0ZXMvdWktZ3JpZC1yb3cuaHRtbCIsInNyYy90ZW1wbGF0ZXMvdWlHcmlkSGVhZGVyQ2VsbC5odG1sIiwic3JjL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRhdGUuaHRtbCIsInNyYy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kaWFsb2cuaHRtbCIsInNyYy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbCIsInNyYy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1zdHJpbmcuaHRtbCIsInNyY1xcdXRpbHNcXHJ4LmpzIiwic3JjXFxsaWIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLFNBQVMsZ0JBQVQsQ0FBMEIsQ0FBMUIsRUFBNkI7QUFDekIsV0FBTyxDQUFDLEtBQUssRUFBTixFQUFVLFdBQVYsRUFBUDtBQUNIOztBQUVEO0FBQ0E7QUFDQTtBQUNBOztBQUVBLE9BQU8sT0FBUCxHQUFpQixDQUFDLFFBQUQsRUFBVyxVQUFVLE1BQVYsRUFBa0I7QUFDMUMsV0FBTztBQUNILGtCQUFVLEdBRFA7QUFFSCxlQUFPO0FBQ0gscUJBQVMsSUFETjtBQUVILDBCQUFjLElBRlg7QUFHSCw0QkFBZ0IsSUFIYjtBQUlILDZCQUFpQjtBQUpkLFNBRko7QUFRSCxrQkFBVSxrQkFBVSxPQUFWLEVBQW1CLEtBQW5CLEVBQTBCO0FBQ2hDLG1IQUVvQixNQUFNLFVBRjFCLGlHQUk2QixNQUFNLGtCQUpuQyxpY0FZOEUsTUFBTSxVQVpwRjtBQWVILFNBeEJFO0FBeUJILGNBQU0sY0FBVSxLQUFWLEVBQWlCLE9BQWpCLEVBQTBCLEtBQTFCLEVBQWlDO0FBQ25DLGdCQUFJLGNBQWMsT0FBTyxNQUFNLFVBQWIsQ0FBbEI7QUFDQSxnQkFBSSxLQUFKOztBQUVBLGtCQUFNLE1BQU4sR0FBZSxFQUFmO0FBQ0Esa0JBQU0sWUFBTixHQUFxQixFQUFyQjs7QUFFQSxrQkFBTSxrQkFBTixHQUEyQjtBQUFBLHVCQUFRLE1BQU0sT0FBTixDQUFjLEtBQWQsQ0FBb0IsTUFBTSxvQkFBMUIsRUFBZ0QsRUFBRSxVQUFGLEVBQWhELENBQVI7QUFBQSxhQUEzQjs7QUFFQSxrQkFBTSxNQUFOLDJCQUF1QyxVQUFVLENBQVYsRUFBYTtBQUNoRCxvQkFBSSxRQUFRLEVBQUUsQ0FBRixLQUFRLEVBQXBCO0FBQ0Esb0JBQUksT0FBTyxFQUFFLENBQUYsS0FBUSxFQUFuQjtBQUNBLG9CQUFJLFFBQVEsRUFBWjs7QUFFQSx1QkFBTyxpQkFBaUIsSUFBakIsQ0FBUDs7QUFFQSxxQkFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE1BQU0sTUFBMUIsRUFBa0MsR0FBbEM7QUFDSSx3QkFBSSxDQUFDLElBQUQsSUFBUyxpQkFBaUIsWUFBWSxLQUFaLEVBQW1CLEVBQUUsTUFBTSxNQUFNLENBQU4sQ0FBUixFQUFuQixDQUFqQixFQUF5RCxPQUF6RCxDQUFpRSxJQUFqRSxNQUEyRSxDQUFDLENBQXpGLEVBQ0ksTUFBTSxJQUFOLENBQVcsTUFBTSxDQUFOLENBQVg7QUFGUixpQkFJQSxNQUFNLE1BQU4sR0FBZSxLQUFmO0FBRUgsYUFiRCxFQWFHLElBYkg7QUFjSDtBQWhERSxLQUFQO0FBa0RILENBbkRnQixDQUFqQjs7Ozs7QUNUQSxPQUFPLE9BQVAsR0FBaUIsQ0FBQyxJQUFELEVBQU8sVUFBVSxFQUFWLEVBQWM7QUFDbEMsV0FBTztBQUNILGtCQUFVLEdBRFA7QUFFSCxlQUFPLElBRko7QUFHSCx5VEFIRztBQU9ILGNBQU0sY0FBVSxLQUFWLEVBQWlCLE9BQWpCLEVBQTBCLEtBQTFCLEVBQWlDOztBQUVuQyxnQkFBSSxJQUFKO0FBQ0EsZ0JBQUksVUFBSjtBQUNBLGdCQUFJLE9BQU8sQ0FBWDtBQUNBLGdCQUFJLFVBQVUsSUFBSSxHQUFHLE9BQVAsRUFBZDs7QUFFQSxrQkFBTSxPQUFOLEdBQWdCLE1BQU0sT0FBTixDQUFjLEtBQWQsQ0FBb0IsTUFBTSxhQUFOLElBQXVCLElBQTNDLEtBQW9ELEVBQXBFOztBQUVBLGdCQUFJLFVBQVUsUUFBUSxNQUFSLENBQWUsTUFBTSxPQUFyQixFQUE4QjtBQUN4QyxzQkFBTSxFQURrQztBQUV4QywyQ0FBMkIsR0FGYTtBQUd4QyxvQ0FBb0IsSUFIb0I7QUFJeEMsK0JBQWUsdUJBQVUsT0FBVixFQUFtQjtBQUM5QiwwQkFBTSxPQUFOLENBQWMsT0FBZCxHQUF3QixPQUF4QjtBQUNBLDRCQUFRLElBQVIsQ0FBYSxFQUFiLENBQWdCLFdBQWhCLENBQTRCLEtBQTVCLEVBQW1DLFdBQW5DO0FBQ0EsZ0NBQVksUUFBUSxJQUFwQixFQUEwQixDQUFDLFFBQVEsVUFBUixDQUFtQixDQUFuQixDQUFELENBQTFCO0FBQ0EsNEJBQVEsY0FBUixDQUF1QixFQUF2QixDQUEwQixnQkFBMUIsQ0FBMkMsS0FBM0MsRUFBa0QsZ0JBQWxEO0FBQ0g7QUFUdUMsYUFBOUIsQ0FBZDs7QUFZQSxrQkFBTSxNQUFOLENBQWEsb0JBQWIsRUFBbUM7QUFBQSx1QkFBVyxNQUFNLE9BQU4sR0FBZ0IsZUFBZSxPQUFmLENBQTNCO0FBQUEsYUFBbkMsRUFBdUYsSUFBdkY7QUFDQSxrQkFBTSxNQUFOLENBQWEsU0FBYixFQUF3QjtBQUFBLHVCQUFLLFFBQVEsTUFBUixDQUFlLElBQWYsQ0FBTDtBQUFBLGFBQXhCLEVBQW1ELElBQW5EOztBQUVBLHFCQUFTLGdCQUFULEdBQTRCO0FBQ3hCLHdCQUFRLE1BQVIsQ0FBZSxLQUFmO0FBQ0g7O0FBRUQscUJBQVMsV0FBVCxDQUFxQixJQUFyQixFQUEyQixXQUEzQixFQUF3QztBQUNwQyx1QkFBTyxrQkFBa0IsV0FBbEIsQ0FBUDtBQUNBLHdCQUFRLE1BQVIsQ0FBZSxJQUFmO0FBQ0g7O0FBRUQsb0JBQ0ssR0FETCxDQUNTO0FBQUEsdUJBQUssY0FBYyxDQUFuQjtBQUFBLGFBRFQsRUFFSyxRQUZMLENBRWMsQ0FGZCxFQUdLLE1BSEwsQ0FHWSxLQUhaLEVBSUssYUFKTCxDQUltQixVQUFVLE1BQVYsRUFBa0I7QUFDN0IsNkJBQWEsS0FBYjs7QUFFQSxvQkFBSSxNQUFKLEVBQVk7QUFDUiwyQkFBTyxDQUFQO0FBQ0EsNEJBQVEsSUFBUixHQUFlLEVBQWY7QUFDSDs7QUFFRCxvQkFBSSxTQUFTLFFBQVEsTUFBUixDQUFlLEVBQUUsVUFBRixFQUFRLFVBQVIsRUFBYyxVQUFVLEdBQXhCLEVBQWYsRUFBOEMsTUFBTSxPQUFwRCxDQUFiO0FBQ0Esb0JBQUksU0FBUyxRQUFRLEtBQVIsQ0FBYyxNQUFkLENBQWI7O0FBRUEsb0JBQUksQ0FBQyxPQUFPLFNBQVosRUFDSSxTQUFTLEdBQUcsVUFBSCxDQUFjLFdBQWQsQ0FBMEIsR0FBRyxJQUFILENBQVEsTUFBUixDQUExQixDQUFUOztBQUVKLHVCQUFPLE9BQU8sS0FBUCxDQUFhO0FBQUEsMkJBQUssR0FBRyxVQUFILENBQWMsS0FBZCxFQUFMO0FBQUEsaUJBQWIsQ0FBUDtBQUNILGFBbkJMLEVBb0JLLE1BcEJMLENBb0JZLEtBcEJaLEVBcUJLLEdBckJMLENBcUJTLFVBQVUsSUFBVixFQUFnQjtBQUNqQjtBQUNBLHdCQUFRLElBQVIsR0FBZSxRQUFRLElBQVIsQ0FBYSxNQUFiLENBQW9CLElBQXBCLENBQWY7QUFDQSxzQkFBTSxPQUFOLENBQWMsT0FBZCxDQUFzQixjQUF0QixDQUFxQyxVQUFyQyxDQUFnRCxLQUFoRCxFQUF1RCxLQUFLLE1BQUwsSUFBZSxHQUF0RTtBQUNILGFBekJMLEVBMEJLLFNBMUJMO0FBMkJIO0FBbkVFLEtBQVA7QUFxRUgsQ0F0RWdCLENBQWpCOztBQXdFQSxTQUFTLGNBQVQsQ0FBd0IsT0FBeEIsRUFBaUM7QUFDN0IsUUFBSSxJQUFJLEVBQVI7O0FBRUEsUUFBSSxPQUFKLEVBQ0ksS0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFFBQVEsTUFBNUIsRUFBb0MsR0FBcEMsRUFBeUM7QUFDckMsWUFBSSxTQUFTLFFBQVEsQ0FBUixDQUFiO0FBQ0EsWUFBSSxVQUFVLE9BQU8sT0FBUCxJQUFrQixFQUFoQzs7QUFFQSxZQUFJLFFBQVEsTUFBWixFQUNJLEVBQUUsT0FBTyxJQUFULElBQWlCLE9BQWpCO0FBQ1A7O0FBRUwsV0FBTyxDQUFQO0FBQ0g7O0FBRUQsU0FBUyxpQkFBVCxDQUEyQixXQUEzQixFQUF3QztBQUNwQyxRQUFJLElBQUksRUFBUjs7QUFFQSxTQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksWUFBWSxNQUFoQyxFQUF3QyxHQUF4QyxFQUE2QztBQUN6QyxZQUFJLENBQUosRUFBTyxLQUFLLEdBQUw7O0FBRVAsWUFBSSxNQUFNLFlBQVksQ0FBWixDQUFWO0FBQ0EsWUFBSSxJQUFJLElBQVIsRUFDSSxLQUFLLElBQUksSUFBSixHQUFXLEdBQVgsR0FBaUIsSUFBSSxJQUFKLENBQVMsU0FBL0I7QUFDUDs7QUFFRCxXQUFPLENBQVA7QUFDSDs7Ozs7QUNuR0QsT0FBTyxPQUFQLEdBQWlCLENBQUMsb0JBQUQsRUFBdUIsUUFBdkIsRUFBaUMsVUFBVSxrQkFBVixFQUE4QixLQUE5QixFQUFxQztBQUNuRixXQUFPO0FBQ0gsZUFBTyxJQURKO0FBRUgsbU1BRkc7QUFLSCxjQUFNLGNBQVUsS0FBVixFQUFpQixPQUFqQixFQUEwQixLQUExQixFQUFpQztBQUNuQyxnQkFBSSxVQUFVLE1BQU0sTUFBTSxhQUFaLENBQWQ7O0FBRUEsa0JBQU0sUUFBTixHQUFpQixZQUFZO0FBQUEsMkJBQ0osUUFBUSxLQUFSLEtBQWtCLENBRGQ7O0FBQUEsb0JBQ25CLFVBRG1CLFFBQ25CLFVBRG1COztBQUV6QixvQkFBSSxVQUFKLEVBQ0ksS0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFdBQVcsTUFBL0IsRUFBdUMsR0FBdkM7QUFDSSx3QkFBSSxXQUFXLENBQVgsRUFBYyxPQUFkLElBQXlCLFdBQVcsQ0FBWCxFQUFjLE9BQWQsQ0FBc0IsTUFBbkQsRUFDSSxPQUFPLElBQVA7QUFGUjtBQUdQLGFBTkQ7O0FBUUEsa0JBQU0sVUFBTixHQUFtQixZQUFZO0FBQzNCLG9CQUFJLGNBQWMsUUFBUSxLQUFSLEtBQWtCLEVBQXBDO0FBQ0EsbUNBQW1CLEVBQUUsd0JBQUYsRUFBbkI7QUFDSCxhQUhEO0FBSUg7QUFwQkUsS0FBUDtBQXNCSCxDQXZCZ0IsQ0FBakI7Ozs7O0FDQUEsT0FBTyxPQUFQLEdBQWlCLENBQUMsOEJBQUQsRUFBaUMsVUFBVSxPQUFWLEVBQW1CO0FBQ2pFLFdBQU8sU0FBUyxvQkFBVCxDQUE4QixLQUE5QixFQUFxQztBQUN4QyxlQUFPLFFBQVEsTUFBTSxTQUFOLENBQWdCLENBQWhCLENBQVIsS0FBK0IsS0FBdEM7QUFDSCxLQUZEO0FBR0gsQ0FKZ0IsQ0FBakI7Ozs7O0FDQUEsT0FBTyxPQUFQLEdBQWlCLENBQUMsWUFBWTs7QUFFMUIsUUFBSSxVQUFVLElBQWQ7O0FBRUEsUUFBSSxJQUFJLFNBQUosQ0FBSSxDQUFVLEdBQVYsRUFBZTtBQUNuQixlQUFPLEVBQUUsT0FBRixDQUFVLE9BQVYsRUFBbUIsR0FBbkIsQ0FBUDtBQUNILEtBRkQ7O0FBSUEsTUFBRSxJQUFGLEdBQVMsVUFBVSxJQUFWLEVBQWdCO0FBQ3JCLFlBQUksQ0FBQyxJQUFMLEVBQVcsT0FBTyxPQUFQO0FBQ1gsa0JBQVUsSUFBVjtBQUNILEtBSEQ7O0FBS0EsTUFBRSxPQUFGLEdBQVk7QUFDUixZQUFJO0FBQ0EsbUJBQU8sT0FEUDtBQUVBLG9CQUFRLFFBRlI7QUFHQSwyQkFBZSxpQkFIZjtBQUlBLHVCQUFXLFlBSlg7QUFLQSxxQkFBUyxTQUxUO0FBTUEsa0JBQU0sTUFOTjtBQU9BLGdCQUFJO0FBUEosU0FESTtBQVVSLFlBQUk7QUFDQSxtQkFBTyxXQURQO0FBRUEsb0JBQVEsU0FGUjtBQUdBLDJCQUFlLHdCQUhmO0FBSUEsdUJBQVcsZ0JBSlg7QUFLQSxxQkFBUyxTQUxUO0FBTUEsa0JBQU0sSUFOTjtBQU9BLGdCQUFJO0FBUEo7QUFWSSxLQUFaOztBQXFCQSxXQUFPLENBQVA7QUFDSCxDQW5DZ0IsQ0FBakI7Ozs7O0FDQUEsU0FBUyxlQUFULENBQXlCLENBQXpCLEVBQTRCLENBQTVCLEVBQStCO0FBQzNCLFdBQU8sRUFBRSxXQUFGLEdBQWdCLEVBQUUsV0FBbEIsR0FBZ0MsQ0FBQyxDQUFqQyxHQUFxQyxFQUFFLFdBQUYsR0FBZ0IsRUFBRSxXQUFsQixHQUFnQyxDQUFoQyxHQUFvQyxDQUFoRjtBQUNIOztBQUVELFNBQVMsV0FBVCxDQUFxQixPQUFyQixFQUE4QjtBQUMxQixRQUFJLFNBQVMsRUFBYjs7QUFFQSxTQUFLLElBQUksSUFBSSxDQUFiLEVBQWdCLElBQUksUUFBUSxNQUE1QixFQUFvQyxHQUFwQyxFQUF5QztBQUNyQyxZQUFJLFNBQVMsUUFBUSxDQUFSLENBQWI7QUFDQSxZQUFJLFVBQVUsUUFBUSxJQUFSLENBQWEsT0FBTyxPQUFQLElBQWtCLEVBQS9CLENBQWQ7O0FBRUEsYUFBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLFFBQVEsTUFBNUIsRUFBb0MsR0FBcEMsRUFBeUM7QUFDckMsZ0JBQUksU0FBUyxRQUFRLENBQVIsQ0FBYjtBQUNBLG1CQUFPLE1BQVAsR0FBZ0IsTUFBaEI7QUFDQSxtQkFBTyxJQUFQLENBQVksTUFBWjtBQUNIO0FBQ0o7O0FBRUQsV0FBTyxNQUFQO0FBQ0g7O0FBRUQsU0FBUyxXQUFULENBQXFCLE9BQXJCLEVBQThCLE9BQTlCLEVBQXVDO0FBQ25DLFNBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxRQUFRLE1BQTVCLEVBQW9DLEdBQXBDO0FBQ0ksZ0JBQVEsQ0FBUixFQUFXLE9BQVgsR0FBcUIsRUFBckI7QUFESixLQUdBLEtBQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxRQUFRLE1BQTVCLEVBQW9DLEdBQXBDLEVBQXlDO0FBQ3JDLFlBQUksU0FBUyxRQUFRLENBQVIsQ0FBYjtBQUNBLGVBQU8sTUFBUCxDQUFjLE9BQWQsQ0FBc0IsSUFBdEIsQ0FBMkIsTUFBM0I7QUFDQSxlQUFPLE9BQU8sTUFBZDtBQUNIO0FBQ0o7O0FBRUQsT0FBTyxPQUFQLEdBQWlCLENBQUMsV0FBRCxFQUFjLFVBQWQsRUFBMEIsVUFBVSxTQUFWLEVBQXFCLFFBQXJCLEVBQStCO0FBQ3RFLFdBQU8sVUFBVSxPQUFWLEVBQW1CO0FBQUEsWUFDaEIsV0FEZ0IsR0FDQSxPQURBLENBQ2hCLFdBRGdCOzs7QUFHdEIsWUFBSSxTQUFTO0FBQ1QsOEJBQWtCLElBRFQ7QUFFVCxpQ0FBcUIsSUFGWjtBQUdULHdCQUFZLENBQUMsUUFBRCxFQUFXLFdBQVgsRUFBd0IsVUFBVSxLQUFWLEVBQWlCLFNBQWpCLEVBQTRCOztBQUU1RCxzQkFBTSxPQUFOLEdBQWdCLFlBQVksVUFBWixDQUF1QixLQUF2QixHQUErQixJQUEvQixDQUFvQyxlQUFwQyxDQUFoQjtBQUNBLHNCQUFNLE9BQU4sR0FBZ0IsWUFBWSxNQUFNLE9BQWxCLENBQWhCOztBQUVBLHNCQUFNLEtBQU4sR0FBYyxVQUFVLEtBQVYsRUFBaUI7QUFDM0IsZ0NBQVksTUFBTSxPQUFsQixFQUEyQixNQUFNLE9BQWpDO0FBQ0EsOEJBQVUsSUFBVixDQUFlLEtBQWY7QUFDSCxpQkFIRDs7QUFLQSxzQkFBTSxNQUFOLEdBQWU7QUFBQSwyQkFBSyxVQUFVLE1BQVYsRUFBTDtBQUFBLGlCQUFmO0FBQ0Esc0JBQU0sZ0JBQU4sR0FBeUIsRUFBekI7QUFDQSxzQkFBTSxjQUFOLEdBQXVCLElBQXZCOztBQUVBLHNCQUFNLFlBQU4sR0FBcUIsVUFBVSxNQUFWLEVBQWtCO0FBQ25DLHdCQUFJLFFBQVEsTUFBTSxPQUFOLENBQWMsT0FBZCxDQUFzQixNQUF0QixDQUFaO0FBQ0Esd0JBQUksVUFBVSxDQUFDLENBQWYsRUFDSSxNQUFNLE9BQU4sQ0FBYyxNQUFkLENBQXFCLEtBQXJCLEVBQTRCLENBQTVCO0FBQ1AsaUJBSkQ7O0FBTUE7QUFDQSxzQkFBTSxxQkFBTixHQUE4QixVQUFVLGNBQVYsRUFBMEI7QUFDcEQsd0JBQUksQ0FBQyxjQUFMLEVBQXFCOztBQUVyQjtBQUNBLDBCQUFNLE9BQU4sQ0FBYyxPQUFkLENBQXNCO0FBQ2xCLGdDQUFRO0FBRFUscUJBQXRCOztBQUlBLDZCQUFTLFlBQVk7QUFDakI7QUFDQSw4QkFBTSxnQkFBTixHQUF5QixFQUF6QjtBQUNBLDhCQUFNLGNBQU4sR0FBdUIsSUFBdkI7O0FBRUEsNEJBQUksUUFBUSxTQUFTLGFBQVQsQ0FBdUIsMkJBQXZCLENBQVo7QUFDQSw0QkFBSSxLQUFKLEVBQ0ksTUFBTSxLQUFOO0FBQ1AscUJBUkQ7QUFTSCxpQkFqQkQ7QUFrQkgsYUF2Q1csQ0FISDtBQTJDVCwyQkFBZSxJQTNDTjtBQTRDVCx5QkFBYTtBQTVDSixTQUFiOztBQStDQSxlQUFPLFVBQVUsSUFBVixDQUFlLE1BQWYsQ0FBUDtBQUNILEtBbkREO0FBb0RILENBckRnQixDQUFqQjs7Ozs7QUNoQ0EsUUFBUSwyQkFBUjtBQUNBLFFBQVEsNkJBQVI7QUFDQSxRQUFRLDZCQUFSO0FBQ0EsUUFBUSw2QkFBUjs7QUFFQSxJQUFJLG1CQUFtQixRQUFRLHlCQUFSLENBQXZCO0FBQ0EsSUFBSSxZQUFZLFFBQVEsb0JBQVIsQ0FBaEI7QUFDQSxJQUFJLGVBQWUsUUFBUSx1QkFBUixDQUFuQjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsQ0FBQyxnQkFBRCxFQUFtQixVQUFTLGNBQVQsRUFBeUI7QUFDekQ7QUFDQSxtQkFBZSxHQUFmLENBQW1CLDBCQUFuQixFQUErQyxlQUFlLEdBQWYsQ0FBbUIsZ0JBQW5CLENBQS9DO0FBQ0EsbUJBQWUsR0FBZixDQUFtQixxQkFBbkIsRUFBMEMsZUFBZSxHQUFmLENBQW1CLFNBQW5CLENBQTFDO0FBQ0EsbUJBQWUsR0FBZixDQUFtQix3QkFBbkIsRUFBNkMsZUFBZSxHQUFmLENBQW1CLFlBQW5CLENBQTdDO0FBQ0gsQ0FMZ0IsQ0FBakI7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDZkEsR0FBRyxVQUFILENBQWMsU0FBZCxDQUF3QixNQUF4QixHQUFpQyxVQUFVLEtBQVYsRUFBaUIsT0FBakIsRUFBMEI7QUFDdkQsUUFBSSxPQUFPLElBQVg7QUFDQSxXQUFPLElBQUksR0FBRyxtQkFBUCxDQUEyQixVQUFVLFFBQVYsRUFBb0I7QUFDbEQsZUFBTyxLQUFLLFNBQUwsQ0FDSCxVQUFVLENBQVYsRUFBYTtBQUNULGtCQUFNLE1BQU4sQ0FBYSxZQUFZO0FBQUUseUJBQVMsTUFBVCxDQUFnQixDQUFoQjtBQUFxQixhQUFoRDtBQUNILFNBSEUsRUFJSCxTQUFTLE9BQVQsQ0FBaUIsSUFBakIsQ0FBc0IsUUFBdEIsQ0FKRyxFQUtILFNBQVMsV0FBVCxDQUFxQixJQUFyQixDQUEwQixRQUExQixDQUxHLENBQVA7QUFPSCxLQVJNLENBQVA7QUFTSCxDQVhEOzs7OztBQ0FBLFFBQ0ssTUFETCxDQUNZLGVBRFosRUFDNkIsQ0FBQyxZQUFELEVBQWUsV0FBZixFQUE0QixTQUE1QixFQUF1Qyx1QkFBdkMsRUFBZ0UscUJBQWhFLEVBQXVGLHdCQUF2RixDQUQ3Qjs7QUFHSTtBQUhKLENBSUssU0FKTCxDQUllLGdCQUpmLEVBSWlDLFFBQVEsOEJBQVIsQ0FKakMsRUFLSyxTQUxMLENBS2UsUUFMZixFQUt5QixRQUFRLHNCQUFSLENBTHpCLEVBTUssU0FOTCxDQU1lLG9CQU5mLEVBTXFDLFFBQVEsbUNBQVIsQ0FOckM7O0FBUUk7QUFSSixDQVNLLE1BVEwsQ0FTWSxzQkFUWixFQVNvQyxRQUFRLGdDQUFSLENBVHBDOztBQVdJO0FBWEosQ0FZSyxPQVpMLENBWWEsb0JBWmIsRUFZbUMsUUFBUSwrQkFBUixDQVpuQyxFQWFLLE9BYkwsQ0FhYSw4QkFiYixFQWE2QyxRQUFRLHlDQUFSLENBYjdDOztBQWVJO0FBZkosQ0FnQkssR0FoQkwsQ0FnQlMsUUFBUSxhQUFSLENBaEJUOztBQWtCQSxRQUFRLFlBQVIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gc2VhcmNoYWJsZVN0cmluZyhhKSB7XHJcbiAgICByZXR1cm4gKGEgfHwgJycpLnRvTG93ZXJDYXNlKCk7ICAgICAgICBcclxufVxyXG5cclxuLy8vIGV4YW1wbGVcclxuLy8vXHJcbi8vLyAgICAgPHhwLWF1dG9jb21wbGV0ZSB4cC1pdGVtcz1cIml0ZW0gaW4gaXRlbXNcIiB4cC1pdGVtLXRleHQ9XCJpdGVtLmRpc3BsYXlcIj48L3hwLWF1dG9jb21wbGV0ZT5cclxuLy8vXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFsnJHBhcnNlJywgZnVuY3Rpb24gKCRwYXJzZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHNjb3BlOiB7XHJcbiAgICAgICAgICAgIHhwSXRlbXM6ICc9PycsXHJcbiAgICAgICAgICAgIHhwU2VhcmNoVGV4dDogJz0/JyxcclxuICAgICAgICAgICAgeHBTZWxlY3RlZEl0ZW06ICc9PycsXHJcbiAgICAgICAgICAgIHhwRmxvYXRpbmdMYWJlbDogJ0AnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0ZW1wbGF0ZTogZnVuY3Rpb24gKGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBgPG1kLWF1dG9jb21wbGV0ZVxyXG4gICAgICAgICAgICAgICAgbWQtaXRlbXM9XCJpdGVtIGluIF9pdGVtc1wiXHJcbiAgICAgICAgICAgICAgICBtZC1pdGVtLXRleHQ9XCIke2F0dHJzLnhwSXRlbVRleHR9XCJcclxuICAgICAgICAgICAgICAgIG1kLXNlYXJjaC10ZXh0PVwieHBTZWFyY2hUZXh0XCJcclxuICAgICAgICAgICAgICAgIG1kLXNlYXJjaC10ZXh0LWNoYW5nZT1cIiR7YXR0cnMueHBTZWFyY2hUZXh0Q2hhbmdlfVwiXHJcbiAgICAgICAgICAgICAgICBtZC1zZWxlY3RlZC1pdGVtPVwieHBTZWxlY3RlZEl0ZW1cIlxyXG4gICAgICAgICAgICAgICAgbWQtc2VsZWN0ZWQtaXRlbS1jaGFuZ2U9XCJzZWxlY3RlZEl0ZW1DaGFuZ2UoeHBTZWxlY3RlZEl0ZW0pXCJcclxuICAgICAgICAgICAgICAgIG1kLW1pbi1sZW5ndGg9XCIwXCJcclxuICAgICAgICAgICAgICAgIG1kLWF1dG9zZWxlY3Q9XCJ0cnVlXCJcclxuICAgICAgICAgICAgICAgIG1kLW1hdGNoLWNhc2UtaW5zZW5zaXRpdmU9XCJ0cnVlXCJcclxuICAgICAgICAgICAgICAgIG1kLWZsb2F0aW5nLWxhYmVsPVwie3t4cEZsb2F0aW5nTGFiZWx9fVwiPlxyXG4gICAgICAgICAgICAgICAgICAgIDxtZC1pdGVtLXRlbXBsYXRlPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBtZC1oaWdobGlnaHQtdGV4dD1cInhwU2VhcmNoVGV4dFwiIG1kLWhpZ2hsaWdodC1mbGFncz1cImlcIj57eyR7YXR0cnMueHBJdGVtVGV4dH19fTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICA8L21kLWl0ZW0tdGVtcGxhdGU+XHJcbiAgICAgICAgICAgIDwvbWQtYXV0b2NvbXBsZXRlPmA7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgIHZhciBnZXRJdGVtVGV4dCA9ICRwYXJzZShhdHRycy54cEl0ZW1UZXh0KTtcclxuICAgICAgICAgICAgdmFyIGl0ZW1zO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuX2l0ZW1zID0gW107XHJcbiAgICAgICAgICAgIHNjb3BlLl9zZWFyY2hfdGV4dCA9ICcnO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuc2VsZWN0ZWRJdGVtQ2hhbmdlID0gaXRlbSA9PiBzY29wZS4kcGFyZW50LiRldmFsKGF0dHJzLnhwU2VsZWN0ZWRJdGVtQ2hhbmdlLCB7IGl0ZW0gfSk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goYFt4cEl0ZW1zLHhwU2VhcmNoVGV4dF1gLCBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGl0ZW1zID0gZVswXSB8fCBbXTtcclxuICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gZVsxXSB8fCAnJztcclxuICAgICAgICAgICAgICAgIHZhciBhcnJheSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgIHRleHQgPSBzZWFyY2hhYmxlU3RyaW5nKHRleHQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0ZXh0IHx8IHNlYXJjaGFibGVTdHJpbmcoZ2V0SXRlbVRleHQoc2NvcGUsIHsgaXRlbTogaXRlbXNbaV0gfSkpLmluZGV4T2YodGV4dCkgIT09IC0xKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheS5wdXNoKGl0ZW1zW2ldKTtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5faXRlbXMgPSBhcnJheTtcclxuXHJcbiAgICAgICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1dOyIsIm1vZHVsZS5leHBvcnRzID0gWyckcScsIGZ1bmN0aW9uICgkcSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZXN0cmljdDogJ0UnLFxyXG4gICAgICAgIHNjb3BlOiB0cnVlLFxyXG4gICAgICAgIHRlbXBsYXRlOiBgPGRpdiBsYXlvdXQ9XCJjb2x1bW5cIiBjbGFzcz1cInhwLWdyaWRcIj5cclxuICAgICAgICAgICAgPHhwLWdyaWRmaWx0ZXItYnV0dG9uIHhwLWdyaWQtb3B0aW9ucz1cIm9wdGlvbnNcIiBsYXlvdXQ9XCJyb3dcIiBsYXlvdXQtYWxpZ249XCJlbmQgY2VudGVyXCI+PC94cC1ncmlkZmlsdGVyLWJ1dHRvbj5cclxuICAgICAgICAgICAgPGRpdiB1aS1ncmlkPVwib3B0aW9uc1wiIGZsZXggdWktZ3JpZC1yZXNpemUtY29sdW1ucyB1aS1ncmlkLW1vdmUtY29sdW1ucyB1aS1ncmlkLWluZmluaXRlLXNjcm9sbD48L2Rpdj5cclxuICAgICAgICA8L2Rpdj5gLFxyXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBzb3J0O1xyXG4gICAgICAgICAgICB2YXIgbXVzdFJlbG9hZDtcclxuICAgICAgICAgICAgdmFyIHBhZ2UgPSAwO1xyXG4gICAgICAgICAgICB2YXIgcmVmcmVzaCA9IG5ldyBSeC5TdWJqZWN0KCk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5vcHRpb25zID0gc2NvcGUuJHBhcmVudC4kZXZhbChhdHRycy54cEdyaWRPcHRpb25zIHx8ICd7fScpIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBhbmd1bGFyLmV4dGVuZChzY29wZS5vcHRpb25zLCB7XHJcbiAgICAgICAgICAgICAgICBkYXRhOiBbXSxcclxuICAgICAgICAgICAgICAgIGluZmluaXRlU2Nyb2xsUm93c0Zyb21FbmQ6IDEwMCxcclxuICAgICAgICAgICAgICAgIGluZmluaXRlU2Nyb2xsRG93bjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG9uUmVnaXN0ZXJBcGk6IGZ1bmN0aW9uIChncmlkQXBpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUub3B0aW9ucy5ncmlkQXBpID0gZ3JpZEFwaTtcclxuICAgICAgICAgICAgICAgICAgICBncmlkQXBpLmNvcmUub24uc29ydENoYW5nZWQoc2NvcGUsIHNvcnRDaGFuZ2VkKTtcclxuICAgICAgICAgICAgICAgICAgICBzb3J0Q2hhbmdlZChncmlkQXBpLmdyaWQsIFtvcHRpb25zLmNvbHVtbkRlZnNbMV1dKTtcclxuICAgICAgICAgICAgICAgICAgICBncmlkQXBpLmluZmluaXRlU2Nyb2xsLm9uLm5lZWRMb2FkTW9yZURhdGEoc2NvcGUsIG5lZWRMb2FkTW9yZURhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLiR3YXRjaCgnb3B0aW9ucy5jb2x1bW5EZWZzJywgY29sdW1ucyA9PiBzY29wZS5maWx0ZXJzID0gY29tcHV0ZUZpbHRlcnMoY29sdW1ucyksIHRydWUpO1xyXG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goJ2ZpbHRlcnMnLCBfID0+IHJlZnJlc2gub25OZXh0KHRydWUpLCB0cnVlKTsgXHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBuZWVkTG9hZE1vcmVEYXRhKCkge1xyXG4gICAgICAgICAgICAgICAgcmVmcmVzaC5vbk5leHQoZmFsc2UpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBzb3J0Q2hhbmdlZChncmlkLCBzb3J0Q29sdW1ucykge1xyXG4gICAgICAgICAgICAgICAgc29ydCA9IGNvbXB1dGVTb3J0U3RyaW5nKHNvcnRDb2x1bW5zKTtcclxuICAgICAgICAgICAgICAgIHJlZnJlc2gub25OZXh0KHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZWZyZXNoXHJcbiAgICAgICAgICAgICAgICAubWFwKGUgPT4gbXVzdFJlbG9hZCB8PSBlKVxyXG4gICAgICAgICAgICAgICAgLmRlYm91bmNlKDEpXHJcbiAgICAgICAgICAgICAgICAuJGFwcGx5KHNjb3BlKVxyXG4gICAgICAgICAgICAgICAgLmZsYXRNYXBMYXRlc3QoZnVuY3Rpb24gKHJlbG9hZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG11c3RSZWxvYWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlbG9hZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWdlID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5kYXRhID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gYW5ndWxhci5leHRlbmQoeyBwYWdlLCBzb3J0LCBwYWdlU2l6ZTogMTAwIH0sIHNjb3BlLmZpbHRlcnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBvcHRpb25zLmZldGNoKHBhcmFtcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LnN1YnNjcmliZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gUnguT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZSgkcS53aGVuKHJlc3VsdCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LmNhdGNoKF8gPT4gUnguT2JzZXJ2YWJsZS5lbXB0eSgpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuJGFwcGx5KHNjb3BlKVxyXG4gICAgICAgICAgICAgICAgLnRhcChmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhZ2UrKztcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGEgPSBvcHRpb25zLmRhdGEuY29uY2F0KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLm9wdGlvbnMuZ3JpZEFwaS5pbmZpbml0ZVNjcm9sbC5kYXRhTG9hZGVkKGZhbHNlLCBkYXRhLmxlbmd0aCA+PSAxMDApO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1dO1xyXG5cclxuZnVuY3Rpb24gY29tcHV0ZUZpbHRlcnMoY29sdW1ucykge1xyXG4gICAgdmFyIG8gPSB7fTtcclxuXHJcbiAgICBpZiAoY29sdW1ucylcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGNvbHVtbiA9IGNvbHVtbnNbaV07XHJcbiAgICAgICAgICAgIHZhciBmaWx0ZXJzID0gY29sdW1uLmZpbHRlcnMgfHwgW107XHJcblxyXG4gICAgICAgICAgICBpZiAoZmlsdGVycy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICBvW2NvbHVtbi5uYW1lXSA9IGZpbHRlcnM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIHJldHVybiBvO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb21wdXRlU29ydFN0cmluZyhzb3J0Q29sdW1ucykge1xyXG4gICAgdmFyIHMgPSAnJztcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNvcnRDb2x1bW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHMpIHMgKz0gJywnO1xyXG5cclxuICAgICAgICB2YXIgY29sID0gc29ydENvbHVtbnNbaV07XHJcbiAgICAgICAgaWYgKGNvbC5zb3J0KVxyXG4gICAgICAgICAgICBzICs9IGNvbC5uYW1lICsgJzonICsgY29sLnNvcnQuZGlyZWN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzO1xyXG59IiwibW9kdWxlLmV4cG9ydHMgPSBbJ3hwR3JpZGZpbHRlckRpYWxvZycsICckcGFyc2UnLCBmdW5jdGlvbiAoeHBHcmlkZmlsdGVyRGlhbG9nLCBwYXJzZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzY29wZTogdHJ1ZSxcclxuICAgICAgICB0ZW1wbGF0ZTogYDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIkZpbHRlclwiIG5nLWNsaWNrPVwic2hvd0RpYWxvZygpXCIgbmctY2xhc3M9XCJ7J21kLXByaW1hcnknOiBmaWx0ZXJlZCgpfVwiPlxyXG4gICAgICAgICAgICA8bmctbWQtaWNvbiBpY29uPVwiZmlsdGVyX2xpc3RcIj48L25nLW1kLWljb24+XHJcbiAgICAgICAgPC9tZC1idXR0b24+YCxcclxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XHJcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0gcGFyc2UoYXR0cnMueHBHcmlkT3B0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICBzY29wZS5maWx0ZXJlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciB7IGNvbHVtbkRlZnMgfSA9IG9wdGlvbnMoc2NvcGUpIHx8IDA7XHJcbiAgICAgICAgICAgICAgICBpZiAoY29sdW1uRGVmcylcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbkRlZnMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW5EZWZzW2ldLmZpbHRlcnMgJiYgY29sdW1uRGVmc1tpXS5maWx0ZXJzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuc2hvd0RpYWxvZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBncmlkT3B0aW9ucyA9IG9wdGlvbnMoc2NvcGUpIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgeHBHcmlkZmlsdGVyRGlhbG9nKHsgZ3JpZE9wdGlvbnMgfSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufV07IiwibW9kdWxlLmV4cG9ydHMgPSBbJ3hwQ29tcG9uZW50c1RyYW5zbGF0ZVNlcnZpY2UnLCBmdW5jdGlvbiAoc2VydmljZSkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHhwQ29tcG9uZW50VHJhbnNsYXRlKHZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIHNlcnZpY2UodmFsdWUuc3Vic3RyaW5nKDIpKSB8fCB2YWx1ZTtcclxuICAgIH07XHJcbn1dOyIsIm1vZHVsZS5leHBvcnRzID0gW2Z1bmN0aW9uICgpIHtcclxuXHJcbiAgICB2YXIgY3VycmVudCA9ICdlbic7XHJcblxyXG4gICAgdmFyIGYgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgcmV0dXJuIGYubG9jYWxlc1tjdXJyZW50XVtrZXldO1xyXG4gICAgfVxyXG5cclxuICAgIGYubGFuZyA9IGZ1bmN0aW9uIChsYW5nKSB7XHJcbiAgICAgICAgaWYgKCFsYW5nKSByZXR1cm4gY3VycmVudDtcclxuICAgICAgICBjdXJyZW50ID0gbGFuZztcclxuICAgIH07XHJcblxyXG4gICAgZi5sb2NhbGVzID0ge1xyXG4gICAgICAgIGVuOiB7XHJcbiAgICAgICAgICAgIEFwcGx5OiAnQXBwbHknLFxyXG4gICAgICAgICAgICBDYW5jZWw6ICdDYW5jZWwnLFxyXG4gICAgICAgICAgICBDaG9vc2VBQ29sdW1uOiAnQ2hvb3NlIGEgY29sdW1uJyxcclxuICAgICAgICAgICAgRGVsZXRlQWxsOiAnRGVsZXRlIEFsbCcsXHJcbiAgICAgICAgICAgIEZpbHRlcnM6ICdGaWx0ZXJzJyxcclxuICAgICAgICAgICAgRnJvbTogJ0Zyb20nLFxyXG4gICAgICAgICAgICBUbzogJ1RvJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnI6IHtcclxuICAgICAgICAgICAgQXBwbHk6ICdBcHBsaXF1ZXInLFxyXG4gICAgICAgICAgICBDYW5jZWw6ICdBbm51bGVyJyxcclxuICAgICAgICAgICAgQ2hvb3NlQUNvbHVtbjogJ0Nob2lzaXNzZXogdW5lIGNvbG9ubmUnLFxyXG4gICAgICAgICAgICBEZWxldGVBbGw6ICdTdXBwcmltZXIgdG91dCcsXHJcbiAgICAgICAgICAgIEZpbHRlcnM6ICdGaWx0cmVzJyxcclxuICAgICAgICAgICAgRnJvbTogJ0RlJyxcclxuICAgICAgICAgICAgVG86ICfDgCdcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBmO1xyXG59XTsiLCJmdW5jdGlvbiBjb2x1bW5zQ29tcGFyZXIoYSwgYikge1xyXG4gICAgcmV0dXJuIGEuZGlzcGxheU5hbWUgPCBiLmRpc3BsYXlOYW1lID8gLTEgOiBhLmRpc3BsYXlOYW1lID4gYi5kaXNwbGF5TmFtZSA/IDEgOiAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkRmlsdGVycyhjb2x1bW5zKSB7XHJcbiAgICB2YXIgcmVzdWx0ID0gW107XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2x1bW5zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGNvbHVtbiA9IGNvbHVtbnNbaV07XHJcbiAgICAgICAgdmFyIGZpbHRlcnMgPSBhbmd1bGFyLmNvcHkoY29sdW1uLmZpbHRlcnMgfHwgW10pO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGZpbHRlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgdmFyIGZpbHRlciA9IGZpbHRlcnNbal07XHJcbiAgICAgICAgICAgIGZpbHRlci5jb2x1bW4gPSBjb2x1bW47XHJcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZpbHRlcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNhdmVGaWx0ZXJzKGNvbHVtbnMsIGZpbHRlcnMpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1ucy5sZW5ndGg7IGkrKylcclxuICAgICAgICBjb2x1bW5zW2ldLmZpbHRlcnMgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbHRlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgZmlsdGVyID0gZmlsdGVyc1tpXTtcclxuICAgICAgICBmaWx0ZXIuY29sdW1uLmZpbHRlcnMucHVzaChmaWx0ZXIpO1xyXG4gICAgICAgIGRlbGV0ZSBmaWx0ZXIuY29sdW1uO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFsnJG1kRGlhbG9nJywgJyR0aW1lb3V0JywgZnVuY3Rpb24gKCRtZERpYWxvZywgJHRpbWVvdXQpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAob3B0aW9ucykge1xyXG4gICAgICAgIHZhciB7IGdyaWRPcHRpb25zIH0gPSBvcHRpb25zO1xyXG5cclxuICAgICAgICB2YXIgZGlhbG9nID0ge1xyXG4gICAgICAgICAgICBiaW5kVG9Db250cm9sbGVyOiB0cnVlLFxyXG4gICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOiB0cnVlLFxyXG4gICAgICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckbWREaWFsb2cnLCBmdW5jdGlvbiAoc2NvcGUsICRtZERpYWxvZykge1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmNvbHVtbnMgPSBncmlkT3B0aW9ucy5jb2x1bW5EZWZzLnNsaWNlKCkuc29ydChjb2x1bW5zQ29tcGFyZXIpO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuZmlsdGVycyA9IGxvYWRGaWx0ZXJzKHNjb3BlLmNvbHVtbnMpO1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLmFwcGx5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2F2ZUZpbHRlcnMoc2NvcGUuY29sdW1ucywgc2NvcGUuZmlsdGVycyk7XHJcbiAgICAgICAgICAgICAgICAgICAgJG1kRGlhbG9nLmhpZGUodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5jYW5jZWwgPSBfID0+ICRtZERpYWxvZy5jYW5jZWwoKTtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmF1dG9Db21wbGV0ZVRleHQgPSAnJztcclxuICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkQ29sdW1uID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICBzY29wZS5yZW1vdmVGaWx0ZXIgPSBmdW5jdGlvbiAoZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gc2NvcGUuZmlsdGVycy5pbmRleE9mKGZpbHRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsdGVycy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB3aGVuIGEgY29sdW1uIGlzIHNlbGVjdGVkIGluIHRoZSBhdXRvY29tcGxldGVcclxuICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkQ29sdW1uQ2hhbmdlZCA9IGZ1bmN0aW9uIChzZWxlY3RlZENvbHVtbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghc2VsZWN0ZWRDb2x1bW4pIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGNvbHVtbnMgdG8gdGhlIGxpc3Qgb2YgZmlsdGVycyBmb3IgZWRpdGluZy5cclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5maWx0ZXJzLnVuc2hpZnQoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHNlbGVjdGVkQ29sdW1uXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2xlYXIgdGhlIGF1dG9jb21wbGV0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5hdXRvQ29tcGxldGVUZXh0ID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnNlbGVjdGVkQ29sdW1uID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy54cC1ncmlkZmlsdGVyLWl0ZW0gaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1dLFxyXG4gICAgICAgICAgICBlc2NhcGVUb0Nsb3NlOiB0cnVlLFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kaWFsb2cuaHRtbCdcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gJG1kRGlhbG9nLnNob3coZGlhbG9nKTtcclxuICAgIH07XHJcbn1dOyIsInJlcXVpcmUoJy4veHAtZ3JpZGZpbHRlci1kYXRlLmh0bWwnKTtcclxucmVxdWlyZSgnLi94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sJyk7XHJcbnJlcXVpcmUoJy4veHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbCcpO1xyXG5yZXF1aXJlKCcuL3hwLWdyaWRmaWx0ZXItc3RyaW5nLmh0bWwnKTtcclxuXHJcbnZhciB1aUdyaWRIZWFkZXJDZWxsID0gcmVxdWlyZSgnLi91aUdyaWRIZWFkZXJDZWxsLmh0bWwnKTtcclxudmFyIHVpR3JpZFJvdyA9IHJlcXVpcmUoJy4vdWktZ3JpZC1yb3cuaHRtbCcpO1xyXG52YXIgdWlHcmlkSGVhZGVyID0gcmVxdWlyZSgnLi91aS1ncmlkLWhlYWRlci5odG1sJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFsnJHRlbXBsYXRlQ2FjaGUnLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkge1xyXG4gICAgLy9SZXBsYWNlIHVpLWdyaWQgdGVtcGxhdGVzIFxyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd1aS1ncmlkL3VpR3JpZEhlYWRlckNlbGwnLCAkdGVtcGxhdGVDYWNoZS5nZXQodWlHcmlkSGVhZGVyQ2VsbCkpO1xyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd1aS1ncmlkL3VpLWdyaWQtcm93JywgJHRlbXBsYXRlQ2FjaGUuZ2V0KHVpR3JpZFJvdykpO1xyXG4gICAgJHRlbXBsYXRlQ2FjaGUucHV0KCd1aS1ncmlkL3VpLWdyaWQtaGVhZGVyJywgJHRlbXBsYXRlQ2FjaGUuZ2V0KHVpR3JpZEhlYWRlcikpO1xyXG59XTsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy91aS1ncmlkLWhlYWRlci5odG1sJyxcbiAgICAnPGRpdlxcbicgK1xuICAgICcgIHJvbGU9XCJyb3dncm91cFwiXFxuJyArXG4gICAgJyAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlclwiPiA8IS0tIHRoZWFkZXIgLS0+XFxuJyArXG4gICAgJyAgPGRpdlxcbicgK1xuICAgICcgICAgY2xhc3M9XCJ1aS1ncmlkLXRvcC1wYW5lbFwiPlxcbicgK1xuICAgICcgICAgPGRpdlxcbicgK1xuICAgICcgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLXZpZXdwb3J0XCI+XFxuJyArXG4gICAgJyAgICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNhbnZhc1wiPlxcbicgK1xuICAgICcgICAgICAgIDxkaXZcXG4nICtcbiAgICAnICAgICAgICAgIGNsYXNzPVwidWktZ3JpZC1oZWFkZXItY2VsbC13cmFwcGVyXCJcXG4nICtcbiAgICAnICAgICAgICAgIG5nLXN0eWxlPVwiY29sQ29udGFpbmVyLmhlYWRlckNlbGxXcmFwcGVyU3R5bGUoKVwiPlxcbicgK1xuICAgICcgICAgICAgICAgPGRpdlxcbicgK1xuICAgICcgICAgICAgICAgICByb2xlPVwicm93XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jZWxsLXJvd1wiPlxcbicgK1xuICAgICcgICAgICAgICAgICA8ZGl2XFxuJyArXG4gICAgJyAgICAgICAgICAgICAgY2xhc3M9XCJ1aS1ncmlkLWhlYWRlci1jZWxsIHVpLWdyaWQtY2xlYXJmaXhcIlxcbicgK1xuICAgICcgICAgICAgICAgICAgIG5nLXJlcGVhdD1cImNvbCBpbiBjb2xDb250YWluZXIucmVuZGVyZWRDb2x1bW5zIHRyYWNrIGJ5IGNvbC51aWRcIlxcbicgK1xuICAgICcgICAgICAgICAgICAgIHVpLWdyaWQtaGVhZGVyLWNlbGxcXG4nICtcbiAgICAnICAgICAgICAgICAgICBtZC1jb2xvcnM9XCI6OntiYWNrZ3JvdW5kOiBcXCdiYWNrZ3JvdW5kXFwnfVwiXFxuJyArXG4gICAgJyAgICAgICAgICAgICAgY29sPVwiY29sXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgICByZW5kZXItaW5kZXg9XCIkaW5kZXhcIj5cXG4nICtcbiAgICAnICAgICAgICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICAgICAgICA8L2Rpdj5cXG4nICtcbiAgICAnICAgICAgICA8L2Rpdj5cXG4nICtcbiAgICAnICAgICAgPC9kaXY+XFxuJyArXG4gICAgJyAgICA8L2Rpdj5cXG4nICtcbiAgICAnICA8L2Rpdj5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3VpLWdyaWQtaGVhZGVyLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy91aS1ncmlkLXJvdy5odG1sJyxcbiAgICAnPGRpdiBuZy1yZXBlYXQ9XCIoY29sUmVuZGVySW5kZXgsIGNvbCkgaW4gY29sQ29udGFpbmVyLnJlbmRlcmVkQ29sdW1ucyB0cmFjayBieSBjb2wudWlkXCIgdWktZ3JpZC1vbmUtYmluZC1pZC1ncmlkPVwicm93UmVuZGVySW5kZXggKyBcXCctXFwnICsgY29sLnVpZCArIFxcJy1jZWxsXFwnXCJcXG4nICtcbiAgICAnICAgIGNsYXNzPVwidWktZ3JpZC1jZWxsXCIgbmctY2xhc3M9XCJ7IFxcJ3VpLWdyaWQtcm93LWhlYWRlci1jZWxsXFwnOiBjb2wuaXNSb3dIZWFkZXIgfVwiIG1kLWNvbG9ycz1cIjo6e2JhY2tncm91bmQ6IFxcJ2JhY2tncm91bmQtaHVlLVxcJyArIChyb3dSZW5kZXJJbmRleCAlIDIgKyAxKX1cIiByb2xlPVwie3tjb2wuaXNSb3dIZWFkZXIgPyBcXCdyb3doZWFkZXJcXCcgOiBcXCdncmlkY2VsbFxcJ319XCJcXG4nICtcbiAgICAnICAgIHVpLWdyaWQtY2VsbD5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3VpLWdyaWQtcm93Lmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy91aUdyaWRIZWFkZXJDZWxsLmh0bWwnLFxuICAgICc8ZGl2XFxuJyArXG4gICAgJyAgcm9sZT1cImNvbHVtbmhlYWRlclwiXFxuJyArXG4gICAgJyAgbmctY2xhc3M9XCJ7IFxcJ3NvcnRhYmxlXFwnOiBzb3J0YWJsZSB9XCJcXG4nICtcbiAgICAnICB1aS1ncmlkLW9uZS1iaW5kLWFyaWEtbGFiZWxsZWRieS1ncmlkPVwiY29sLnVpZCArIFxcJy1oZWFkZXItdGV4dCBcXCcgKyBjb2wudWlkICsgXFwnLXNvcnRkaXItdGV4dFxcJ1wiXFxuJyArXG4gICAgJyAgYXJpYS1zb3J0PVwie3tjb2wuc29ydC5kaXJlY3Rpb24gPT0gYXNjID8gXFwnYXNjZW5kaW5nXFwnIDogKCBjb2wuc29ydC5kaXJlY3Rpb24gPT0gZGVzYyA/IFxcJ2Rlc2NlbmRpbmdcXCcgOiAoIWNvbC5zb3J0LmRpcmVjdGlvbiA/IFxcJ25vbmVcXCcgOiBcXCdvdGhlclxcJykpfX1cIj5cXG4nICtcbiAgICAnICA8bWQtYnV0dG9uXFxuJyArXG4gICAgJyAgICByb2xlPVwiYnV0dG9uXCJcXG4nICtcbiAgICAnICAgIHRhYmluZGV4PVwiMFwiXFxuJyArXG4gICAgJyAgICBjbGFzcz1cInVpLWdyaWQtY2VsbC1jb250ZW50cyB1aS1ncmlkLWhlYWRlci1jZWxsLXByaW1hcnktZm9jdXNcIlxcbicgK1xuICAgICcgICAgY29sLWluZGV4PVwicmVuZGVySW5kZXhcIlxcbicgK1xuICAgICcgICAgdGl0bGU9XCJUT09MVElQXCI+XFxuJyArXG4gICAgJyAgICA8c3BhblxcbicgK1xuICAgICcgICAgICBjbGFzcz1cInVpLWdyaWQtaGVhZGVyLWNlbGwtbGFiZWxcIlxcbicgK1xuICAgICcgICAgICB1aS1ncmlkLW9uZS1iaW5kLWlkLWdyaWQ9XCJjb2wudWlkICsgXFwnLWhlYWRlci10ZXh0XFwnXCI+XFxuJyArXG4gICAgJyAgICAgIHt7IGNvbC5kaXNwbGF5TmFtZSBDVVNUT01fRklMVEVSUyB9fVxcbicgK1xuICAgICcgICAgPC9zcGFuPlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICAgIDxzcGFuXFxuJyArXG4gICAgJyAgICAgIHVpLWdyaWQtb25lLWJpbmQtaWQtZ3JpZD1cImNvbC51aWQgKyBcXCctc29ydGRpci10ZXh0XFwnXCJcXG4nICtcbiAgICAnICAgICAgdWktZ3JpZC12aXNpYmxlPVwiY29sLnNvcnQuZGlyZWN0aW9uXCJcXG4nICtcbiAgICAnICAgICAgYXJpYS1sYWJlbD1cInt7Z2V0U29ydERpcmVjdGlvbkFyaWFMYWJlbCgpfX1cIj5cXG4nICtcbiAgICAnICAgICAgPGlcXG4nICtcbiAgICAnICAgICAgIG5nLWNsYXNzPVwieyBcXCd1aS1ncmlkLWljb24tdXAtZGlyXFwnOiBjb2wuc29ydC5kaXJlY3Rpb24gPT0gYXNjLCBcXCd1aS1ncmlkLWljb24tZG93bi1kaXJcXCc6IGNvbC5zb3J0LmRpcmVjdGlvbiA9PSBkZXNjLCBcXCd1aS1ncmlkLWljb24tYmxhbmtcXCc6ICFjb2wuc29ydC5kaXJlY3Rpb24gfVwiXFxuJyArXG4gICAgJyAgICAgICB0aXRsZT1cInt7aXNTb3J0UHJpb3JpdHlWaXNpYmxlKCkgPyBpMThuLmhlYWRlckNlbGwucHJpb3JpdHkgKyBcXCcgXFwnICsgKCBjb2wuc29ydC5wcmlvcml0eSArIDEgKSAgOiBudWxsfX1cIlxcbicgK1xuICAgICcgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XFxuJyArXG4gICAgJyAgICAgPC9pPlxcbicgK1xuICAgICcgICAgIDxzdWJcXG4nICtcbiAgICAnICAgICAgIHVpLWdyaWQtdmlzaWJsZT1cImlzU29ydFByaW9yaXR5VmlzaWJsZSgpXCJcXG4nICtcbiAgICAnICAgICAgIGNsYXNzPVwidWktZ3JpZC1zb3J0LXByaW9yaXR5LW51bWJlclwiPlxcbicgK1xuICAgICcgICAgICAge3tjb2wuc29ydC5wcmlvcml0eSArIDF9fVxcbicgK1xuICAgICcgICAgIDwvc3ViPlxcbicgK1xuICAgICcgICAgPC9zcGFuPlxcbicgK1xuICAgICcgIDwvbWQtYnV0dG9uPlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICA8ZGl2IHVpLWdyaWQtZmlsdGVyPjwvZGl2PlxcbicgK1xuICAgICc8L2Rpdj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMvdWlHcmlkSGVhZGVyQ2VsbC5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kYXRlLmh0bWwnLFxuICAgICc8ZGl2IGxheW91dD1cInJvd1wiIGxheW91dC1hbGlnbj1cImNlbnRlciBjZW50ZXJcIj5cXG4nICtcbiAgICAnICAgIDxsYWJlbCBuZy1iaW5kPVwiZmlsdGVyLmNvbHVtbi5kaXNwbGF5TmFtZVwiPjwvbGFiZWw+XFxuJyArXG4gICAgJyAgICA8bWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgICAgIDxsYWJlbD57e1xcJ3QuRnJvbVxcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9sYWJlbD5cXG4nICtcbiAgICAnICAgICAgICA8bWQtZGF0ZXBpY2tlciBuZy1tb2RlbD1cImZpbHRlci5mcm9tXCIgbmctY2hhbmdlPVwiZmlsdGVyLnRvID0gZmlsdGVyLmZyb20gJiYgZmlsdGVyLnRvICYmIGZpbHRlci50byA8IGZpbHRlci5mcm9tID8gZmlsdGVyLmZyb20gOiBmaWx0ZXIudG9cIj48L21kLWRhdGVwaWNrZXI+XFxuJyArXG4gICAgJyAgICA8L21kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgIDxtZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICAgICAgPGxhYmVsPnt7XFwndC5Ub1xcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9sYWJlbD5cXG4nICtcbiAgICAnICAgICAgICA8bWQtZGF0ZXBpY2tlciBuZy1tb2RlbD1cImZpbHRlci50b1wiIG5nLWNoYW5nZT1cImZpbHRlci5mcm9tID0gZmlsdGVyLmZyb20gJiYgZmlsdGVyLnRvICYmIGZpbHRlci5mcm9tID4gZmlsdGVyLnRvID8gZmlsdGVyLnRvIDogZmlsdGVyLmZyb21cIj48L21kLWRhdGVwaWNrZXI+XFxuJyArXG4gICAgJyAgICA8L21kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItZGF0ZS5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1kaWFsb2cuaHRtbCcsXG4gICAgJzxtZC1kaWFsb2cgY2xhc3M9XCJ4cC1ncmlkZmlsdGVyXCIgYXJpYS1sYWJlbD1cIkdyaWRGaWx0ZXJcIiBsYXlvdXQtcGFkZGluZz5cXG4nICtcbiAgICAnICAgIDxkaXYgY2xhc3M9XCJkaWFsb2dIZWFkZXJcIiBmbGV4PVwiYXV0b1wiPlxcbicgK1xuICAgICcgICAgICAgIDxzcGFuPnt7XFwndC5GaWx0ZXJzXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlIH19PC9zcGFuPlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICAgICAgICA8eHAtYXV0b2NvbXBsZXRlXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLWZsb2F0aW5nLWxhYmVsPVwie3sgXFwndC5DaG9vc2VBQ29sdW1uXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlIH19XCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtaXRlbXM9XCJjb2x1bW5zXCJcXG4nICtcbiAgICAnICAgICAgICAgICAgeHAtaXRlbS10ZXh0PVwiaXRlbS5kaXNwbGF5TmFtZVwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLXNlYXJjaC10ZXh0PVwiYXV0b0NvbXBsZXRlVGV4dFwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLXNlbGVjdGVkLWl0ZW09XCJzZWxlY3RlZENvbHVtblwiXFxuJyArXG4gICAgJyAgICAgICAgICAgIHhwLXNlbGVjdGVkLWl0ZW0tY2hhbmdlPVwic2VsZWN0ZWRDb2x1bW5DaGFuZ2VkKGl0ZW0pXCIvPlxcbicgK1xuICAgICcgICAgPC9kaXY+XFxuJyArXG4gICAgJ1xcbicgK1xuICAgICcgICAgPG1kLWRpYWxvZy1jb250ZW50IGZsZXg9XCIxMDBcIj5cXG4nICtcbiAgICAnICAgICAgICA8bWQtbGlzdD5cXG4nICtcbiAgICAnICAgICAgICAgICAgPG1kLWxpc3QtaXRlbSBjbGFzcz1cInNlY29uZGFyeS1idXR0b24tcGFkZGluZyB4cC1ncmlkZmlsdGVyLWl0ZW1cIiBuZy1yZXBlYXQ9XCJmaWx0ZXIgaW4gZmlsdGVyc1wiPlxcbicgK1xuICAgICcgICAgICAgICAgICAgICAgPG5nLWluY2x1ZGUgZmxleD1cImF1dG9cIiBzcmM9XCJcXCcvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItXFwnICsgKGZpbHRlci5jb2x1bW4uZmlsdGVyVHlwZSB8fCBcXCdzdHJpbmdcXCcpICsgXFwnLmh0bWxcXCdcIj48L25nLWluY2x1ZGU+XFxuJyArXG4gICAgJyAgICAgICAgICAgICAgICA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJSZW1vdmVGaWx0ZXJcIiBjbGFzcz1cIm1kLXNlY29uZGFyeVwiIG5nLWNsaWNrPVwicmVtb3ZlRmlsdGVyKGZpbHRlcilcIj48bmctbWQtaWNvbiBpY29uPVwiZGVsZXRlXCI+PC9uZy1tZC1pY29uPjwvbWQtYnV0dG9uPlxcbicgK1xuICAgICcgICAgICAgICAgICA8L21kLWxpc3QtaXRlbT5cXG4nICtcbiAgICAnICAgICAgICA8L21kLWxpc3Q+XFxuJyArXG4gICAgJyAgICA8L21kLWRpYWxvZy1jb250ZW50PlxcbicgK1xuICAgICdcXG4nICtcbiAgICAnICAgIDxtZC1kaWFsb2ctYWN0aW9ucyBmbGV4PVwiYXV0b1wiPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1idXR0b24gYXJpYS1sYWJlbD1cIkRlbGV0ZUFsbFwiIG5nLWNsaWNrPVwiZmlsdGVycyA9IFtdXCIgbmctZGlzYWJsZWQ9XCIhZmlsdGVycy5sZW5ndGhcIj57e1xcJ3QuRGVsZXRlQWxsXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnICAgICAgICA8bWQtYnV0dG9uIGFyaWEtbGFiZWw9XCJDYW5jZWxcIiBuZy1jbGljaz1cImNhbmNlbCgpXCI+e3tcXCd0LkNhbmNlbFxcJyB8IHhwQ29tcG9uZW50c1RyYW5zbGF0ZX19PC9tZC1idXR0b24+XFxuJyArXG4gICAgJyAgICAgICAgPG1kLWJ1dHRvbiBhcmlhLWxhYmVsPVwiQXBwbHlcIiBuZy1jbGljaz1cImFwcGx5KGZpbHRlcnMpXCI+e3tcXCd0LkFwcGx5XFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L21kLWJ1dHRvbj5cXG4nICtcbiAgICAnICAgIDwvbWQtZGlhbG9nLWFjdGlvbnM+XFxuJyArXG4gICAgJzwvbWQtZGlhbG9nPicpO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFwiL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLWRpYWxvZy5odG1sXCI7IiwidmFyIG5nTW9kdWxlO1xudHJ5IHtcbiAgbmdNb2R1bGUgPSBhbmd1bGFyLm1vZHVsZSgneHAuY29tcG9uZW50cycpO1xufSBjYXRjaCAoZSkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJywgW10pO1xufVxuXG5uZ01vZHVsZS5ydW4oWyckdGVtcGxhdGVDYWNoZScsIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSkge1xuICAkdGVtcGxhdGVDYWNoZS5wdXQoJy90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1udW1iZXIuaHRtbCcsXG4gICAgJzxkaXYgbGF5b3V0PVwicm93XCIgbGF5b3V0LWFsaWduPVwiY2VudGVyIGNlbnRlclwiPlxcbicgK1xuICAgICcgICAgPGxhYmVsIG5nLWJpbmQ9XCJmaWx0ZXIuY29sdW1uLmRpc3BsYXlOYW1lXCI+PC9sYWJlbD5cXG4nICtcbiAgICAnICAgIDxtZC1pbnB1dC1jb250YWluZXI+XFxuJyArXG4gICAgJyAgICAgICAgPGxhYmVsPnt7XFwndC5Gcm9tXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L2xhYmVsPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1pbnB1dCBuZy1tb2RlbD1cImZpbHRlci5mcm9tXCI+PC9tZC1pbnB1dD5cXG4nICtcbiAgICAnICAgIDwvbWQtaW5wdXQtY29udGFpbmVyPlxcbicgK1xuICAgICcgICAgPG1kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnICAgICAgICA8bGFiZWw+e3tcXCd0LlRvXFwnIHwgeHBDb21wb25lbnRzVHJhbnNsYXRlfX08L2xhYmVsPlxcbicgK1xuICAgICcgICAgICAgIDxtZC1pbnB1dCBuZy1tb2RlbD1cImZpbHRlci50b1wiPjwvbWQtaW5wdXQ+XFxuJyArXG4gICAgJyAgICA8L21kLWlucHV0LWNvbnRhaW5lcj5cXG4nICtcbiAgICAnPC9kaXY+Jyk7XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCIvdGVtcGxhdGVzL3hwLWdyaWRmaWx0ZXItbnVtYmVyLmh0bWxcIjsiLCJ2YXIgbmdNb2R1bGU7XG50cnkge1xuICBuZ01vZHVsZSA9IGFuZ3VsYXIubW9kdWxlKCd4cC5jb21wb25lbnRzJyk7XG59IGNhdGNoIChlKSB7XG4gIG5nTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbXSk7XG59XG5cbm5nTW9kdWxlLnJ1bihbJyR0ZW1wbGF0ZUNhY2hlJywgZnVuY3Rpb24gKCR0ZW1wbGF0ZUNhY2hlKSB7XG4gICR0ZW1wbGF0ZUNhY2hlLnB1dCgnL3RlbXBsYXRlcy94cC1ncmlkZmlsdGVyLXN0cmluZy5odG1sJyxcbiAgICAnPG1kLWlucHV0LWNvbnRhaW5lciBjbGFzcz1cIm1kLWJsb2NrXCI+XFxuJyArXG4gICAgJyAgPGxhYmVsIG5nLWJpbmQ9XCJmaWx0ZXIuY29sdW1uLmRpc3BsYXlOYW1lXCI+PC9sYWJlbD5cXG4nICtcbiAgICAnICA8aW5wdXQgdHlwZT1cInRleHRcIiBuZy1tb2RlbD1cImZpbHRlci52YWx1ZVwiIHJlcXVpcmVkPlxcbicgK1xuICAgICc8L21kLWlucHV0LWNvbnRhaW5lcj4nKTtcbn1dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBcIi90ZW1wbGF0ZXMveHAtZ3JpZGZpbHRlci1zdHJpbmcuaHRtbFwiOyIsIlJ4Lk9ic2VydmFibGUucHJvdG90eXBlLiRhcHBseSA9IGZ1bmN0aW9uIChzY29wZSwgdGhpc0FyZykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgcmV0dXJuIG5ldyBSeC5Bbm9ueW1vdXNPYnNlcnZhYmxlKGZ1bmN0aW9uIChvYnNlcnZlcikge1xyXG4gICAgICAgIHJldHVybiBzZWxmLnN1YnNjcmliZShcclxuICAgICAgICAgICAgZnVuY3Rpb24gKGUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7IG9ic2VydmVyLm9uTmV4dChlKTsgfSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IuYmluZChvYnNlcnZlciksXHJcbiAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXHJcbiAgICAgICAgKTtcclxuICAgIH0pO1xyXG59OyIsImFuZ3VsYXJcclxuICAgIC5tb2R1bGUoJ3hwLmNvbXBvbmVudHMnLCBbJ25nTWF0ZXJpYWwnLCAnbmdNZEljb25zJywgJ3VpLmdyaWQnLCAndWkuZ3JpZC5yZXNpemVDb2x1bW5zJywgJ3VpLmdyaWQubW92ZUNvbHVtbnMnLCAndWkuZ3JpZC5pbmZpbml0ZVNjcm9sbCddKVxyXG5cclxuICAgIC8vIGRpcmVjdGl2ZXNcclxuICAgIC5kaXJlY3RpdmUoJ3hwQXV0b2NvbXBsZXRlJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3hwLWF1dG9jb21wbGV0ZScpKVxyXG4gICAgLmRpcmVjdGl2ZSgneHBHcmlkJywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3hwLWdyaWQnKSlcclxuICAgIC5kaXJlY3RpdmUoJ3hwR3JpZGZpbHRlckJ1dHRvbicsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy94cC1ncmlkZmlsdGVyLWJ1dHRvbicpKVxyXG5cclxuICAgIC8vIGZpbHRlcnNcclxuICAgIC5maWx0ZXIoJ3hwQ29tcG9uZW50VHJhbnNsYXRlJywgcmVxdWlyZSgnLi9maWx0ZXJzL3hwQ29tcG9uZW50VHJhbnNsYXRlJykpXHJcblxyXG4gICAgLy8gc2VydmljZXMgIFxyXG4gICAgLmZhY3RvcnkoJ3hwR3JpZGZpbHRlckRpYWxvZycsIHJlcXVpcmUoJy4vc2VydmljZXMveHBHcmlkZmlsdGVyRGlhbG9nJykpXHJcbiAgICAuZmFjdG9yeSgneHBDb21wb25lbnRzVHJhbnNsYXRlU2VydmljZScsIHJlcXVpcmUoJy4vc2VydmljZXMveHBDb21wb25lbnRzVHJhbnNsYXRlU2VydmljZScpKVxyXG5cclxuICAgIC8vIHRlbXBsYXRlc1xyXG4gICAgLnJ1bihyZXF1aXJlKCcuL3RlbXBsYXRlcycpKTtcclxuXHJcbnJlcXVpcmUoJy4vdXRpbHMvcngnKTtcclxuIl19
