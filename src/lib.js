angular
    .module('xp.components', ['ngMaterial', 'ngMdIcons', 'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.moveColumns', 'ui.grid.infiniteScroll'])

    // directives
    .directive('xpAutocomplete', require('./directives/xp-autocomplete'))
    .directive('xpGrid', require('./directives/xp-grid'))
    .directive('xpGridfilterButton', require('./directives/xp-gridfilter-button'))

    // filters
    .filter('xpComponentsTranslate', require('./filters/xpComponentsTranslate'))

    // services  
    .factory('xpGridfilterDialog', require('./services/xpGridfilterDialog'))
    .factory('xpGridService', require('./services/xpGridService'))
    .factory('xpComponentsTranslateService', require('./services/xpComponentsTranslateService'))

    // templates
    .run(require('./templates'));

require('./utils/rx');
