function searchableString(a) {
    return (a || '').toLowerCase();        
}

/// example
///
///     <xp-autocomplete xp-items="item in items" xp-item-text="item.display"></xp-autocomplete>
///

module.exports = ['$parse', function ($parse) {
    return {
        scope: true,
        restrict: 'E',
        template: function (element, attrs) {
            return `<md-autocomplete
                md-items="item in _items"
                md-item-text="${attrs.xpItemText}"
                md-search-text="${attrs.xpSearchText || '_search_text'}"
                md-search-text-change="${attrs.xpSearchTextChange || ''}"
                md-selected-item="${attrs.xpSelectedItem || ''}"
                md-selected-item-change="${attrs.xpSelectedItemChange || ''}"
                md-min-length="0"
                md-autoselect="true"
                md-match-case-insensitive="true">
                    <md-item-template>
                        <span md-highlight-text="${attrs.xpSearchText || '_search_text' }" md-highlight-flags="i">{{${attrs.xpItemText}}}</span>
                    </md-item-template>
            </md-autocomplete>`;
        },
        link: function (scope, element, attrs) {
            var getItemText = $parse(attrs.xpItemText);
            var items;

            scope._items = [];
            scope._search_text = '';

            scope.$watch(`[${attrs.xpItems},${attrs.xpSearchText || '_search_text' }]`, function (e) {
                var items = e[0] || [];
                var text = e[1] || '';
                var array = [];

                text = searchableString(text);

                for (var i = 0; i < items.length; i++)
                    if (!text || searchableString(getItemText(scope, { item: items[i] })).indexOf(text) !== -1)
                        array.push(items[i]);

                scope._items = array;

            }, true);
        }
    };
}];