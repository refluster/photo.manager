var express = require('express');
var app = express();
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();


var Database = function() {
	//this.dbFileName = 'photo_manager.db';
	this.dbFileName = ':memory:';

	// create db if not exist
	/*
	if (! fs.existsSync(this.dbFileName)) {
		var db = new sqlite3.Database(this.dbFileName);
		db.run("CREATE TABLE photoManager (fileOrig TEXT, fileLarge TEXT, fileThumb TEXT, date TEXT)");
		db.close();
	}
	*/
	this.db = new sqlite3.Database(this.dbFileName);
	this.db.exec("CREATE TABLE photoManager (fileOrig TEXT, fileLarge TEXT, fileThumb TEXT, date TEXT)");
};
Database.prototype.insert = function(fileOrig, fileLarge, fileThumb, date) {
	console.log(this.db);
	console.log({$fileOrig: fileOrig, $fileLarge: fileLarge, $fileThumb: fileThumb, $date: date});

	this.db.run("INSERT INTO photoManager VALUES ($fileOrig, $fileLarge, $fileThumb, $date)",
				 {$fileOrig: fileOrig, $fileLarge: fileLarge, $fileThumb: fileThumb, $date: date});
};
Database.prototype.getByDate = function(date) {
	var data = [];

	this.db.each("SELECT * FROM photoManager where date = $date", {$date: date}, function(err, row) {
		console.log('- ' + row.fileOrig);
	});
};

var Apl = function() {
	var count = 0;
	var db = new Database();

	app.get('/', function (req, res) {
		switch(count) {
		case 0:
			db.insert('f.jpg', 'fl.jpg', 'fthumb.jpg', '2015-08-30');
			db.insert('f.jpg', 'fl.jpg', 'fthumb.jpg', '2015-08-30');
			db.insert('f.jpg', 'fl.jpg', 'fthumb.jpg', '2015-08-31');
			break;
		case 1:
			db.getByDate('2015-08-31');
			break;
		case 2:
			db.getByDate('2015-08-30');
			break;
		}
		++ count;

		res.send('Hello World! ' + req.query.myquery);
	});
	
	var server = app.listen(3000, function () {
		var host = server.address().address;
		var port = server.address().port;
		console.log('Example app listening at http://%s:%s', host, port);
	});
};

new Apl();
