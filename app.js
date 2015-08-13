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

Exif = function() {
	this.ExifImage = require('exif').ExifImage;
};

Exif.prototype.getDate = function(file, callback) {
	try {
		new this.ExifImage({image : file}, function (error, exifData) {
			if (error) {
				console.log('Error: ' + error.message);
			} else {
				console.log(exifData); // Do something with your data!
				var regexp = exifData.exif.CreateDate.match(/(\d+):(\d+):(\d+)/);
				callback(regexp[1] + '-' + regexp[2] + '-' + regexp[3]);
			}
		});
	} catch (error) {
		console.log('Error: ' + error.message);
	}
}

var Apl = function() {
	this.db = new Database();
	this.exif = new Exif();

	var server = app.listen(3000, function () {
		var host = server.address().address;
		var port = server.address().port;
		console.log('Example app listening at http://%s:%s', host, port);
	});
};
Apl.prototype.bind = function() {
	var count = 0;	

	app.get('/db', function (req, res) {
		switch(count) {
		case 0:
			this.db.insert('f.jpg', 'fl.jpg', 'fthumb.jpg', '2015-08-30');
			this.db.insert('f.jpg', 'fl.jpg', 'fthumb.jpg', '2015-08-30');
			this.db.insert('f.jpg', 'fl.jpg', 'fthumb.jpg', '2015-08-31');
			break;
		case 1:
			this.db.getByDate('2015-08-31');
			break;
		case 2:
			this.db.getByDate('2015-08-30');
			break;
		}
		++ count;
		
		res.send('Hello World! ' + req.query.myquery);
	}.bind(this));

	app.get('/exif', function (req, res) {
		this.exif.getDate('sample.jpg', function(date) {
			res.send('Exif! ' + date);
		});
	}.bind(this));
};

var apl = new Apl();
apl.bind();
