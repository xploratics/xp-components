require('./xp-gridfilter-date.html');
require('./xp-gridfilter-dialog.html');
require('./xp-gridfilter-number.html');
require('./xp-gridfilter-string.html');

var uiGridHeaderCell = require('./uiGridHeaderCell.html');

module.exports = ['$templateCache', function($templateCache) {
    //move uiGridHeaderCell template to address used by the ui-grid to replace the default template. 
    $templateCache.put('ui-grid/uiGridHeaderCell', $templateCache.get(uiGridHeaderCell));
}];