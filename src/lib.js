angular
    .module('xp.components', ['ngMaterial', 'ngMdIcons'])

    // directives
    .directive('xpAutocomplete', require('./directives/xp-autocomplete'))
    .directive('xpGridfilterButton', require('./directives/xp-gridfilter-button'))

    // services  
    .factory('xpGridfilterDialog', require('./services/xpGridfilterDialog'))

    // templates    
    .run(require('./templates'));
