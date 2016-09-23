module.exports = [function () {
    return {
        restrict: 'E',
        scope: true,
        template: function (element, attrs) {
            return `
                <div layout="column" class="xp-grid">
                    <xp-gridfilter-button xp-grid-options="options" layout="row" layout-align="end center"></xp-gridfilter-button>
                    <div ui-grid="options" flex ui-grid-resize-columns ui-grid-move-columns></div>
                </div>`;
        },
        link: function (scope, element, attrs) {

            scope.options = scope.$parent.$eval(attrs.xpGridOptions || '{}') || {};
            angular.extend(scope.options, {
                enableColumnMenus: false
            });

            //ui-grid-infinite-scroll
        }
    }
}];