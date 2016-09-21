module.exports = [function () {
    return {
        restrict: 'E',
        scope: true,
        template:
        `<md-autocomplete
             md-items="col in _columns"
             md-item-text="col.displayName"
             md-search-text="autoCompleteText"
             md-search-text-change="autoCompleteTextChanged()"
             md-selected-item="column"
             md-selected-item-change="columnChanged(col)"
             md-min-length="0"
             md-autoselect="true"
             md-match-case-insensitive="true">
                <md-item-template>
                    <span md-highlight-text="autoCompleteText"
                        md-highlight-flags="i">{{col.displayName}}</span>
                </md-item-template>
        </md-autocomplete>`,
        link: function (scope, element, attrs) {
            scope._columns = [];

            function updateAutoCompleteChoice() {
                var cols = scope.uiGridFacetFiltering && scope.uiGridFacetFiltering.columnDefs || [];
                var text = searchableString(scope.autoCompleteText);
                var array = [];

                for (var i = 0; i < cols.length; i++)
                    if (!text || searchableString(cols[i].displayName).indexOf(text) !== -1)
                        array.push(cols[i]);

                array.sort(columnComparer);
                scope.autoCompleteColumns = array;
            }

            scope.autoCompleteTextChanged = function () {

            };

            scope.$watch(`[${attrs.autoCompleteColumns}, autoCompleteText]`, function (newValue) {
                console.log(newValue);
                if (!newValue) return;

            }, true);
        }
    };
}];