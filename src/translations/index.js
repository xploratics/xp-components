module.exports = ['$translateProvider', function (translateProvider) {
    translateProvider
        .translations('en', require('./en'))
        .translations('fr', require('./fr'))
        .preferredLanguage('en');
}];