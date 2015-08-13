var express = require('express');
var path = require('path');
var app = express();
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var process = require('child_process');

var Database = function() {
	this.dbFileName = 'photo_manager.db';
	//this.dbFileName = ':memory:';

	this.db = new sqlite3.Database(this.dbFileName);

	// create table if not exist
	this.db.get(
		"SELECT count(*) AS exist FROM sqlite_master WHERE TYPE='table' AND NAME='photoManager'",
		function(e, row) {
			if (row.exist == 0) {
				console.log('create');
				this.db.exec(
					"CREATE TABLE photoManager (fileOrig TEXT, fileLarge TEXT, fileThumb TEXT, date TEXT)");
			}
		}.bind(this));
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
				//console.log(exifData);
				var regexp = exifData.exif.CreateDate.match(/(\d+):(\d+):(\d+)/);
				callback(regexp[1] + '-' + regexp[2] + '-' + regexp[3]);
			}
		});
	} catch (error) {
		console.log('Error: ' + error.message);
	}
}
Exif.prototype.getImageSize = function(file, callback) {
	try {
		new this.ExifImage({image : file}, function (error, exifData) {
			if (error) {
				console.log('Error: ' + error.message);
			} else {
				callback(exifData.exif.ExifImageWidth,
						 exifData.exif.ExifImageHeight);
			}
		});
	} catch (error) {
		console.log('Error: ' + error.message);
	}
};	

var Apl = function() {
	this.savedRoot = '/Volumes/data/test/savedImage/';
	this.importRoot = '/Volumes/data/test/originalImage/';

	this.originalImageDir = this.savedRoot + '/orig/';
	this.largeImageDir = this.savedRoot + '/large/';
	this.thumbImageDir = this.savedRoot + '/thumb/';

	this.db = new Database();
	this.exif = new Exif();

	this._mkdir(this.savedRoot);
	this._mkdir(this.originalImageDir);
	this._mkdir(this.largeImageDir);
	this._mkdir(this.thumbImageDir);

	var server = app.listen(3000, function () {
		var host = server.address().address;
		var port = server.address().port;
		console.log('Example app listening at http://%s:%s', host, port);
	});
};
Apl.prototype._mkdir = function(path) {
	if (! fs.existsSync(path)) {
		fs.mkdirSync(path, 0755);
	}
};
Apl.prototype.createDateDir = function(date) {
	this._mkdir(this.originalImageDir + date);
	this._mkdir(this.largeImageDir + date);
	this._mkdir(this.thumbImageDir + date);
};

Apl.prototype.importImage = function() {
	fs.readdirSync(this.importRoot).forEach(function(file) {
		if (path.extname(file) != '.jpg' && path.extname(file) != '.JPG') {
			return;
		}

		var sourceImage = this.importRoot + file;

		this.exif.getDate(sourceImage, function(date) {
			var originalImage = this.originalImageDir + date + '/' + file;
			var largeImage = this.largeImageDir + date + '/' +
				path.basename(file, path.extname(file)) + '-large.jpg';
			var thumbImage = this.thumbImageDir + date + '/' +
				path.basename(file, path.extname(file)) + '-thumb.jpg';

			// create directory to save image
			this.createDateDir(date);
			
			console.log({s: sourceImage, o: originalImage, l: largeImage, t: thumbImage});

			// save original image
			process.spawnSync('cp', [sourceImage, originalImage]);

			// save large image
			process.spawnSync('convert', [sourceImage, '-resize', '800x800', largeImage]);

			// save thumbnail image
			process.spawnSync('convert', [sourceImage, '-resize', '120x120', '-gravity', 'Center',
										  '-crop', '80x80-0-0', thumbImage]);
			
			this.db.insert(originalImage, largeImage, thumbImage, date);
		}.bind(this));
	}.bind(this));
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
		switch(count) {
		case 0:
			this.exif.getDate('sample.jpg', function(date) {
				res.send('Exif! ' + date);
				
				this.createDateDir(date);
			}.bind(this));
		case 1:
			this.exif.getImageSize('sample.jpg', function(w, h) {
				res.send('Exif! 1 ' + w + ' ' + h );
			}.bind(this));
		}
		++ count;
	}.bind(this));

	app.get('/spawn', function (req, res) {
		var originalImage = 'sample.jpg';
		var largeImage = path.basename(originalImage, '.jpg') + '-large.jpg'
		var thumbImage = path.basename(originalImage, '.jpg') + '-thumb.jpg'
		var options = [];
		
		// create thumbnail
		options.push(originalImage);
		options.push('-resize');
		options.push('800x800');
		options.push(largeImage);
		
		process.spawnSync('convert', options);

		res.send('spawn! ');
	}.bind(this));
};

//var apl = new Apl();
//apl.bind();
//apl.importImage();
db = new Database();
db.
