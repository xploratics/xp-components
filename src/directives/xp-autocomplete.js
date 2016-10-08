function searchableString(a) {
    return (a || '').toLowerCase();        
}

/// example
///
///     <xp-autocomplete xp-items="item in items" xp-item-text="item.display"></xp-autocomplete>
///

module.exports = ['$parse', '$http', function ($parse, http) {
    return {
        restrict: 'E',
        scope: {
            xpFetch: '@',
            xpItems: '=?',
            xpSearchText: '=?',
            xpSelectedItem: '=?',
            xpFloatingLabel: '@',
            xpValue: '=?'
        },
        template: function (element, attrs) {
            return `<md-autocomplete
                md-items="item in _items"
                md-item-text="${attrs.xpItemText}"
                md-search-text="xpSearchText"
                md-search-text-change="${attrs.xpSearchTextChange}"
                md-selected-item="xpSelectedItem"
                md-selected-item-change="selectedItemChange(xpSelectedItem)"
                md-min-length="0"
                md-autoselect="true"
                md-match-case-insensitive="true"
                md-input-name="${attrs.xpInputName}"
                md-floating-label="{{xpFloatingLabel}}">
                    <md-item-template>
                        <span md-highlight-text="xpSearchText" md-highlight-flags="i">{{${attrs.xpItemText}}}</span>
                    </md-item-template>
            </md-autocomplete>`;
        },
        link: function (scope, element, attrs) {
            var getItemText = $parse(attrs.xpItemText);
            var items;

            scope._items = [];
            scope._search_text = '';

            if (attrs.xpFetch)
                http({ url: attrs.xpFetch }).then(e => scope.xpItems = e.data);

            scope.selectedItemChange = item => scope.$parent.$eval(attrs.xpSelectedItemChange, { item });

            scope.$watch(`[xpItems,xpSearchText]`, function (e) {
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