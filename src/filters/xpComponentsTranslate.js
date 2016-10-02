module.exports = ['xpComponentsTranslateService', function (service) {
    return function xpComponentsTranslate(value) {
        return service(value.substring(2)) || value;
    };
}];