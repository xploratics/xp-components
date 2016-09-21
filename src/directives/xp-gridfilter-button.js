module.exports = ['xpGridfilterDialog', function (xpGridfilterDialog) {
    return {
        scope: true,
        template: `<md-button ng-click="showDialog()">Filter</md-button>`,
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