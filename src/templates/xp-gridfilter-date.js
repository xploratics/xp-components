module.exports = `
<div layout="row" layout-align="center center">
    <label ng-bind="filter.column.displayName"></label>
    <md-input-container>
        <label>From</label>
        <md-datepicker ng-model="filter.from" ng-change="filter.to = filter.from && filter.to && filter.to < filter.from ? filter.from : filter.to"></md-datepicker>
    </md-input-container>
    <md-input-container>
        <label>To</label>
        <md-datepicker ng-model="filter.to" ng-change="filter.from = filter.from && filter.to && filter.from > filter.to ? filter.to : filter.from"></md-datepicker>
    </md-input-container>
</div>`;