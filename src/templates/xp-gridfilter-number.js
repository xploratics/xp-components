module.exports = `
<div layout="row" layout-align="center center">
    <label ng-bind="filter.column.displayName"></label>
    <md-input-container>
        <label>From</label>
        <md-input ng-model="filter.from"></md-input>
    </md-input-container>
    <md-input-container>
        <label>To</label>
        <md-input ng-model="filter.to"></md-input>
    </md-input-container>
</div>`;