module.exports = `
<md-input-container class="md-block">
  <label ng-bind="filter.column.displayName"></label>
  <input type="text" ng-model="filter.value" required>
</md-input-container>`;