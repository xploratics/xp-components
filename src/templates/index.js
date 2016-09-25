require('./xp-grid.html');
require('./xp-gridfilter-date.html');
require('./xp-gridfilter-dialog.html');
require('./xp-gridfilter-number.html');
require('./xp-gridfilter-string.html');

var uiGridHeaderCell = require('./uiGridHeaderCell.html');

module.exports = ['$templateCache', function($templateCache) {
    $templateCache.put('ui-grid/uiGridHeaderCell', $templateCache.get(uiGridHeaderCell));
}];