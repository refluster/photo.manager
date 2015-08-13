var express = require('express');
var app = express();
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
/*
app.get('/', function (req, res) {
	res.send('Hello World! ' + req.query.myquery);
});

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	
	console.log('Example app listening at http://%s:%s', host, port);
});
*/
var Database = function() {
	this.dbFileName = "photo_manager.db";
	

	if (fs.existsSync(this.dbFileName)) {
		this.db = new sqlite3.Database(this.dbFileName);
		
		this.db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
			//			console.log(row.id + ": " + row.info);
			console.log(row);
		});
		
		this.db.close();
		console.log('exist');

	} else {
		// first time
		console.log('none exist');
		this.db = new sqlite3.Database(this.dbFileName);
		this.db.serialize(function() {
			this.db.run("CREATE TABLE photoManager (file TEXT, date TEXT)");

			var stmt = this.db.prepare("INSERT INTO photoManager VALUES ($file, $date)");
			for (var i = 0; i < 10; i++) {
				//stmt.run("Ipsum " + i);
				var date;
				if (i > 5) {
					date = '2015-08-12';
				} else {
					date = '2015-08-13';
				}
				stmt.run({$file: "picture" + i + ".jpg", $date: date});
			}
			stmt.finalize();
		}.bind(this));

		this.db.close();
	}
	
};

db = new Database();

