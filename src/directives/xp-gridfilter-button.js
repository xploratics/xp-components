module.exports = ['xpGridfilterDialog', function (xpGridfilterDialog) {
    return {
        scope: true,
        template: `<md-button ng-click="showDialog()"><ng-md-icon icon="filter_list"></ng-md-icon></md-button>`,
        link: function (scope, element, attrs) {
            scope.showDialog = function () {
                xpGridfilterDialog({
                    filters: [],
                    gridOptions: scope.$eval(attrs.xpGridOptions || '{}')
                });
            };
        }
    };
}];