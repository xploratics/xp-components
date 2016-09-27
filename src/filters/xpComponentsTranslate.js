module.exports = ['xpComponentsLocal', function (xpComponentsLocal) {
    return function xpComponentTranslate(value) {
        value = value.substring(2); // remove 't.'' from the string
        return (xpComponentsLocal.current || xpComponentsLocal.en || {})[value] || value;
    };
}];