angular
    .module('xpComponents', ['ngMaterial'])

    // directives
    .directive('xpAutocomplete', require('./directives/xp-autocomplete'))
    .directive('xpGridfilterButton', require('./directives/xp-gridfilter-button'))
    .directive('xpGridfilterDialog', require('./directives/xp-gridfilter-dialog'))

    // services  
    .factory('xpGridfilterDialog', require('./services/xpGridfilterDialog'));