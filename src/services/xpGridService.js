module.exports = ['$filter', function ($filter) {
    class XpGridService {
        getColumnDisplayName(columnDef) {
            var result = angular.isUndefined(columnDef.displayName) ? columnDef.field : columnDef.displayName;

            if (columnDef.headerCellFilter)
                result = $filter(columnDef.headerCellFilter)(result);

            return result;
        }
    }

    return new XpGridService();
}];