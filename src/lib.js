angular
    .module('xpComponents', ['ngMaterial'])
    .directive('xpAutocomplete', require('./xp-autocomplete'))
    .directive('xpFilterbarAutocomplete', require('./xp-filterbar-autocomplete'));