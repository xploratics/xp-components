# xp-grid

Declaration in html view
```html
<xp-grid xp-grid-options="options"></xp-grid>
```

Configuration in the controller.js
```js
$scope.options = {
    columnDefs: [
        { field: 'book', displayName: 'Book' }
    ],
    fetch: '/api/books'
};
```


## columnDefs
This is an array of columns that can be shown in the grid.

```js
$scope.options = {
    columnDefs: [
        { field: 'firstName', displayName: 'First Name' },
        { field: 'lastName', displayName: 'Last Name' },
        { field: 'email', displayName: 'Email address' }
    ]
}
```
#### arguments
- field: Represent the field name of the column.
- displayName: This value is display on the grid column header.
- filterType: The type of filter that can be applied on the column. 
Supported values are : `string,number,date`

## events

### fetch
Can be either a function or an an url that is called when the grid needs to load
another page.

#### example with a function
```js
$scope.options.fetch = function (params) {
    return $http({ url: '/api/users', params: params });
};
```
Use a function when you need to modify the params or the received data.

#### example with an url string
```js
$scope.options.fetch = '/api/users';
```


### rowClick
This event is called when a row is click on the grid.

#### args

- col: the column that received the click event
- event: the javascript event object
- row: the row that received the click event

#### example

```js
$scope.options = {
    rowClick: function (e) {
        console.log(e.row.firstName);
    };
};
```
