var express = require('express');
var path = require('path');
var app = express();
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var child_process = require('child_process');
var sse = require('sse')

var Database = function(dbFile) {
	this.dbFileName = dbFile;

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
Database.prototype.getAll = function(callback) {
	this.db.all("SELECT * FROM photoManager", function(err, rows) {
		callback(rows);
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
				if (exifData.exif.CreateDate == undefined) {
					callback('2015-01-01');
				} else {
					var regexp = exifData.exif.CreateDate.match(/(\d+):(\d+):(\d+)/);
					callback(regexp[1] + '-' + regexp[2] + '-' + regexp[3]);
				}
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
	this.savedRoot = 'public/savedImage/';
	this.importRoot = 'public/sourceImage/';
	this.originalImageDir = this.savedRoot + '/orig/';
	this.largeImageDir = this.savedRoot + '/large/';
	this.thumbImageDir = this.savedRoot + '/thumb/';

	this._mkdir(this.savedRoot);
	this._mkdir(this.originalImageDir);
	this._mkdir(this.largeImageDir);
	this._mkdir(this.thumbImageDir);

	this.dbFileName = this.savedRoot + 'photo_manager.db';
	//this.dbFileName = ':memory:';

	this.db = new Database(this.dbFileName);
	this.exif = new Exif();

	var server = app.listen(3000, function () {
		var host = server.address().address;
		var port = server.address().port;

		var sseServe = new sse(server);
		console.log('-- sse listen --');
		sseServe.on('connection', function(client) {
			this.sseClient = client;
		}.bind(this));
		console.log('Example app listening at http://%s:%s', host, port);
	}.bind(this));
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
	var files = [];

	fs.readdirSync(this.importRoot).forEach(function(file) {
		if (path.extname(file) != '.jpg' && path.extname(file) != '.JPG') {
			return;
		}
		files.push(file);
	});
	
	var idx = 0;

	files.forEach(function(file) {
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
			child_process.spawnSync('cp', [sourceImage, originalImage]);

			// save large image
			child_process.spawnSync('convert', [sourceImage, '-resize', '800x800', largeImage]);

			// save thumbnail image
			child_process.spawnSync('convert', [sourceImage, '-resize', '120x120', '-gravity', 'Center',
												'-crop', '80x80-0-0', thumbImage]);

			this.db.insert(originalImage.replace(/^public\//,""),
						   largeImage.replace(/^public\//,""),
						   thumbImage.replace(/^public\//,""),
						   date);

			if (this.sseClient != undefined) {
				this.sseClient.send(JSON.stringify(
					{status: 'importing', complete: ++idx, total: files.length}));
			}
		}.bind(this));
	}.bind(this));
};
Apl.prototype.bind = function() {
	var count = 0;	

	app.use(express.static('public'));

	app.get('/db.json', function(req, res) {
		this.db.getAll(function(rows) {
			res.send(JSON.stringify(rows));
		});
	}.bind(this));

	app.get('/import', function(req, res) {
		res.send("");
		console.log('importimage');
		this.importImage();
	}.bind(this));
};

var apl = new Apl();
apl.bind();
