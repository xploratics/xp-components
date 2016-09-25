module.exports = [function () {
    return {
        restrict: 'E',
        scope: true,
        templateUrl: '/templates/xp-grid.html',
        link: function (scope, element, attrs) {

            scope.options = scope.$parent.$eval(attrs.xpGridOptions || '{}') || {};
            angular.extend(scope.options, {
                enableColumnMenus: false
            });

            //ui-grid-infinite-scroll
        }
    }
}];