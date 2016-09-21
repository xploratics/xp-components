module.exports = ['$mdDialog', function ($mdDialog) {
    return function (options) {
        var { filters, gridOptions } = options || 0;

        var dialog = {
            bindToController: true,
            clickOutsideToClose: true,
            controller: function ($scope, $mdDialog, filters, options) {
                $scope.filters = filters;
                $scope.options = options;
                $scope.apply = value => $mdDialog.hide(value);
                $scope.cancel = _ => $mdDialog.cancel();
            },
            escapeToClose: true,
            locals: {
                filters: filters || [],
                options: gridOptions
            },
            template: `<xp-gridfilter-dialog></xp-gridfilter-dialog>`
        };

        return $mdDialog.show(dialog);
    };
}];