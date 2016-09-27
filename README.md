# xp-components
  Components based on angular-materials

## Installation

```shell
bower install --save xp-components
```

Then add a `<script>` to your `index.html`:

```html
  <link rel="stylesheet" type="text/css" href="/bower_components/angular-ui-grid/ui-grid.css">
  <link rel="stylesheet" type="text/css" href="/bower_components/angular-material/angular-material.css">
  <link rel="stylesheet" type="text/css" href="/bower_components/angular-material-icons/angular-material-icons.css">
  <link rel="stylesheet" type="text/css" href="/dist/xp-components.css">

  <script src="/bower_components/angular-ui-grid/ui-grid.js"></script>
  <script src="/bower_components/angular-material/angular-material.js"></script>
  <script src="/bower_components/angular-material-icons/angular-material-icons.js"></script>
  <script src="/bower_components/rxjs/dist/rx.lite.js"></script>
  <script src="/bower_components/xp-components/xp-components.js"></script>
```

## xp-autocomplete

[see angular-material](https://material.angularjs.org/latest/demo/autocomplete)

### example
```html
<xp-autocomplete xp-items="item in items" xp-item-text="item.display"></xp-autocomplete>
```