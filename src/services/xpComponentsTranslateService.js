module.exports = [function () {

    var current = 'en';

    var f = function (key) {
        return f.locales[current][key];
    }

    f.lang = function (lang) {
        if (!lang) return current;
        current = lang;
    };

    f.locales = {
        en: {
            Apply: 'Apply',
            Cancel: 'Cancel',
            ChooseAColumn: 'Choose a column',
            DeleteAll: 'Delete All',
            Filters: 'Filters',
            From: 'From',
            To: 'To'
        },
        fr: {
            Apply: 'Appliquer',
            Cancel: 'Annuler',
            ChooseAColumn: 'Choisissez une colonne',
            DeleteAll: 'Supprimer tout',
            Filters: 'Filtres',
            From: 'De',
            To: 'À'
        }
    };

    return f;
}];