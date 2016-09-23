angular
    .module('xp.components', ['ngMaterial', 'ngMdIcons', 'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.moveColumns'])

    //, 'ui.grid.infiniteScroll'

    // directives
    .directive('xpAutocomplete', require('./directives/xp-autocomplete'))
    .directive('xpGrid', require('./directives/xp-grid'))
    .directive('xpGridfilterButton', require('./directives/xp-gridfilter-button'))

    // services  
    .factory('xpGridfilterDialog', require('./services/xpGridfilterDialog'))

    // templates    
    .run(require('./templates'));
