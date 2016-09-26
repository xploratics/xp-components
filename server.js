var express = require('express');
var app = express();

app.use('/api/users', getUsers);
app.use(express.static('./'));

app.listen(8888, function () {
    console.log('listen to 8888');
});

var users = [];

for (var i = 0; i < 1000; i++)
    users.push({ firstName: 'fname' + i, lastName: 'lname' + i });


function getUsers(req, res) {
    var page = req.query.page || 1;
    var pageSize = req.query.pageSize || 100;
    var end = Math.min(page * pageSize, users.length);
    var start = (page - 1) * pageSize;
    var array =  [];

    for (var i = start; i < end; i++)
        array.push(users[i]);

    res.json(array);
}