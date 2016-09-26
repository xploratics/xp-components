      var express = require('express');
      var app = express();
      
      app.use('/api/users', getUsers);
      app.use(express.static('./'));

      app.listen(8888, function () {
          console.log('listen to 8888');
      });


      function getUsers(req, res) {
          var array = [];

          for (var i = 0; i < 1000; i++)
              array.push({ firstName: 'fname' + i, lastName: 'lname' + i });

          res.json(array);
      }