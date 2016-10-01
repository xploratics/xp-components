angular
    .module('app')
    .config(['$mdThemingProvider', function ($mdThemingProvider) {
        $mdThemingProvider.alwaysWatchTheme(true);

        $mdThemingProvider
            .theme('default')
            .primaryPalette('indigo')
            .accentPalette('orange')
            .warnPalette('red');

        $mdThemingProvider
            .theme('dark')
            .primaryPalette('blue')
            .accentPalette('orange')
            .warnPalette('red')
            .dark();

        $mdThemingProvider.setDefaultTheme('default');
    }]);