var express = require('express');
var app = express();

app.get('/', function (req, res) {
	res.send('Hello World! ' + req.query.myquery);
});

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	
	console.log('Example app listening at http://%s:%s', host, port);
});

var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('./db.bin');
//var db = new sqlite3.Database(':memory:');
 
db.serialize(function() {
	db.run("CREATE TABLE lorem (info TEXT)");
	
	var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
	for (var i = 0; i < 10; i++) {
		stmt.run("Ipsum " + i);
	}
	stmt.finalize();
	
	db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
		console.log(row.id + ": " + row.info);
	});
});

db.close();

