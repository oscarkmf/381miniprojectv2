var http = require('http');
var url  = require('url');
var fs = require('fs');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient; 
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var session = require('cookie-session');
var bodyParser = require('body-parser');
const mongourl = 'mongodb://chiu0709:k64174180@ds149682.mlab.com:49682/381f';
var express = require('express');
var app = express();

app = express();
app.set('view engine','ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
  name: 'session',
  keys: ['in','out']
}));

var users;
var currentUser;
var criteria = {};

//RESTful
app.post('/api/restaurant',function(req,res) {
 	var query = {};
 	var address = {};
 	MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }
	      query.restaurant_id = req.body.restaurantId;
	      query.name = req.body.name;
	      query.borough = req.body.borough;
	      query.photo = req.body.photo;
	      query.mimetype = req.body.mimetype;
	      address.street = req.body.address.street;
	      address.building = req.body.address.building;
	      address.zipcode = req.body.address.zipcode;
	      address.coord = [req.body.address.coord[0], req.body.address.coord[1]];
	      query.address = address;
	      query.grades = [];
	      query.owner = req.body.owner;

	      console.log('Connected to MongoDB');
	      insertRestaurant(db,query,function(result) {
	        db.close();
	        console.log('Disconnected MongoDB');
	        var response = {};
	        if(result){
	        	response.status = 'ok';
	        	response._id = result._id;
	        	res.status(200).json(response).end();
	        }else{
	        	response.status = 'failed'
	        	res.status(200).json(response).end();
	        }
	      });
	});
});
app.get('/api/restaurant/read/name/:restname',function(req,res) {
	var result = {};
 	MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }
	      result.name = req.params.restname;      
	      console.log('Connected to MongoDB');
	      findRestaurant(db, result, function(restaurant) {
	        db.close();
	        console.log('Disconnected MongoDB');
	        res.status(200).json(restaurant).end();
	      });
	});
});
app.get('/api/restaurant/read/borough/:borname',function(req,res) {
	var result = {};
 	MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }
	      result.borough = req.params.borname;      
	      console.log('Connected to MongoDB');
	      findRestaurant(db, result, function(restaurant) {
	        db.close();
	        console.log('Disconnected MongoDB');
	        res.status(200).json(restaurant).end();
	      });
	});
});
app.get('/api/restaurant/read/cuisine/:cuisname',function(req,res) {
	var result = {};
 	MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }
	      result.cuisine = req.params.cuisname;      
	      console.log('Connected to MongoDB');
	      findRestaurant(db, result, function(restaurant) {
	        db.close();
	        console.log('Disconnected MongoDB');
	        res.status(200).json(restaurant).end();
	      });
	});
});
app.get('/loginpre',function(req,res) {
	userLogin();
	res.redirect('/login');
});
app.get('/',function(req,res) {
	res.redirect('/login');
});
app.get('/login',function(req,res) {
	res.render('loginForm', {});
});
app.post('/login',function(req,res) {
	console.log(users);
	req.session.authenticated = false;
	for (var i=0; i<users.length; i++) {
		if (users[i].name == req.body.name &&
		    users[i].password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = users[i].name;
			currentUser = users[i].name;
		}
	}
	if(req.session.authenticated == true){
		res.redirect('/main');
	}else{
		res.redirect('/login');
	}
});

//Login function
function userLogin(){
	 MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }      
	      console.log('Connected to MongoDB');
	      checkUser(db,function(user) {
	        db.close();
	        console.log('Disconnected MongoDB');
	        users = user;
	        console.log(users.length);
	      });
	});
}

function checkUser(db,callback) {
  var cursor = db.collection('loginuser').find();
  var user = [];
  cursor.each(function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      user.push(doc);
    } else {
      callback(user);
    }
  });
}

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.use('/',function(req,res, next) {
	if(req.session.username == null){
		userLogin();
		res.redirect('/loginpre');
	}else{
		next();
	}
});

app.get('/main',function(req,res) {
	mainPageShowRestaurant(res,{});
});

app.get('/create',function(req,res) {
	res.render('createForm', {});
});
app.post('/create',function(req,res) {
	createRestaurant(res, req);
});

app.get('/display',function(req,res) {
	var queryAsObject = req.query;
	console.log(queryAsObject);
	displayRestaurant(res, queryAsObject);
});

app.get('/rate',function(req,res) {
 	var queryAsObject = req.query;
 	var _id = req.query._id;
 	res.render('rate', {_id:_id});
});
app.post('/rate',function(req,res) {
	rate(res, req);
});

app.get('/edit',function(req,res) {
 	var queryAsObject = req.query;
 	editRestaurantForm(res, queryAsObject);
});
app.post('/edit',function(req,res) {
	edit(res, req);
});

app.get('/search',function(req,res) {
	res.render('search', {});
});
app.post('/search',function(req,res) {
	search(res, req);
});
app.get('/delete',function(req,res) {
 	var queryAsObject = req.query;
 	remove(res, queryAsObject);
});


//Main page
function mainPageShowRestaurant(res, criteria){
	 MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }      
	      console.log('Connected to MongoDB');
	      findRestaurant(db, criteria, function(restaurant) {
	        db.close();
	        console.log('Disconnected MongoDB');
	        res.render('mainPage', {rest:restaurant, user:currentUser, criteria:JSON.stringify(criteria)});
	      });
	});
}
function findRestaurant(db,criteria,callback) {
  var cursor = db.collection("restaurants").find(criteria);
  var restaurant = [];
  cursor.each(function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      restaurant.push(doc);
    } else {
      callback(restaurant);
    }
  });
}

//Create Restaurant
function createRestaurant(res, req){
	var form = new formidable.IncomingForm();
	var query = {};
	form.parse(req, function (err, fields, files) {
	    console.log(fields);
	    query.restaurant_id = fields.restaurantId;
	    query.name = fields.name;
	    query.borough = fields.borough;
	    query.cuisine = fields.cuisine;
	    if(files.filetoupload.size != 0){
	    	var filename = files.filetoupload.path;
	    	fs.readFile(filename, function(err,data) {
	    		var image = new Buffer(data).toString('base64');
	    		query.photo = image;
	    	});
	      	var mimetype = files.filetoupload.type;
	      	query.mimetype = mimetype;
	  	}else{
	  		query.photo = "";
	  		query.mimetype = "";
	  	}
	  	var address = {};
	  	address.street = fields.street;
	  	address.building = fields.building;
	  	address.zipcode = fields.zipcode;
	  	var coordx = fields.coordx;
	  	var coordy = fields.coordy;
	  	var coord = [coordx, coordy];
	  	address.coord = coord;
	  	query.address = address;
	  	query.grades = [];
	  	query.owner = currentUser;

	  	console.log(JSON.stringify(fields));
	  	console.log(JSON.stringify(query));
	    console.log(JSON.stringify(files));
	});
	MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }      
	      console.log('Connected to MongoDB');
	      insertRestaurant(db,query,function(result) {
	        db.close();
	        console.log('Disconnected MongoDB');
	        if(result){
	        	console.log(result);
	        	res.redirect('/main');
	        }
	      });
	});
}
function insertRestaurant(db,query,callback) {
  db.collection('restaurants').insertOne(query,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
}

//Display Restaurant
function displayRestaurant(res, queryAsObject) {
	var displayRestaurantId = queryAsObject._id;
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').
			findOne({_id: ObjectId(displayRestaurantId)},function(err,restaurant) {
				assert.equal(err,null);
				db.close();
				console.log('Disconnected from MongoDB\n');
				res.render('display', {rest:restaurant, user:currentUser});
		});
	});
}

//Rate Restaurant
function rate(res, req) {
	var form = new formidable.IncomingForm();
	var rate = {};
	var criteria = {};
	form.parse(req, function (err, fields) {
	    console.log(fields);
	    criteria['_id'] = ObjectId(fields._id);
	    rate['user'] = currentUser;
	    rate['score'] = fields.rate;
	    console.log(rate);
		MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }      
	      console.log('Connected to MongoDB');
		    rateRestaurant(db,criteria,rate,function(result) {
				db.close();
				console.log('Disconnected from MongoDB\n');
				console.log("rate was successful!");
				res.redirect('/main');		
			});
		});
	});
}
function rateRestaurant(db,criteria,rate,callback) {
	db.collection('restaurants').update(
		criteria,{$push: {grades: rate}},function(err,result) {
			assert.equal(err,null);
			console.log("Rate was successfully");
			callback(result);
	});
}

//Edit Restaurant
function editRestaurantForm(res, queryAsObject) {
	var displayRestaurantId = queryAsObject._id;
	MongoClient.connect(mongourl, function(err, db) {
		assert.equal(err,null);
		console.log('Connected to MongoDB\n');
		db.collection('restaurants').
			findOne({_id: ObjectId(displayRestaurantId)},function(err,restaurant) {
				assert.equal(err,null);
				db.close();
				console.log('Disconnected from MongoDB\n');
				res.render('edit', {rest:restaurant});
		});
	});
}
function edit(res, req) {
	var form = new formidable.IncomingForm();
	console.log(form);
	var criteria = {};
	var query = {};
	form.parse(req, function (err, fields, files) {
	    console.log(fields);
	    criteria['_id'] = ObjectId(fields._id);
	    query.restaurant_id = fields.restaurantId;
	    query.name = fields.name;
	    query.borough = fields.borough;
	    query.cuisine = fields.cuisine;
	    if(files.filetoupload.size != 0){
	    	var filename = files.filetoupload.path;
	    	fs.readFile(filename, function(err,data) {
	    		var image = new Buffer(data).toString('base64');
	    		query.photo = image;
	    	});
	      	var mimetype = files.filetoupload.type;
	      	query.mimetype = mimetype;
	  	}
	  	var address = {};
	  	address.street = fields.street;
	  	address.building = fields.building;
	  	address.zipcode = fields.zipcode;
	  	var coordx = fields.coordx;
	  	var coordy = fields.coordy;
	  	var coord = [coordx, coordy];
	  	address.coord = coord;
	  	query.address = address;
	  	query.grades = [];
	  	query.owner = currentUser;

	  	console.log(JSON.stringify(criteria));
	  	console.log(JSON.stringify(query));
	    console.log(JSON.stringify(files));
	});
	MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }      
	      console.log('Connected to MongoDB');
	      editRestaurant(db,criteria,query,function(result) {
				db.close();
				console.log('Disconnected from MongoDB\n');
				res.redirect('/main');		
		  });
	});
}
function editRestaurant(db,criteria,query,callback) {
	db.collection('restaurants').update(
		criteria,{$set: query},function(err,result) {
			assert.equal(err,null);
			console.log("Edit was successfully");
			callback(result);
	});
}

//Search Restaurant
function search(res, req) {
	var form = new formidable.IncomingForm();
	console.log(form);
	var query = {};
	form.parse(req, function (err, fields, files) {
	    console.log(fields);
	    if(fields.restaurantId != ""){
	    	query.restaurant_id = fields.restaurantId;
	    }
	    if(fields.name != ""){
	    	query.name = fields.name;
	    }
	    if(fields.borough != ""){
	    	query.borough = fields.borough;
	    }
	    if(fields.cuisine != ""){
	    	query.cuisine = fields.cuisine;
	    }
	    if(fields.owner != ""){
	    	query.owner = fields.owner;
	    }
	  	var coord = [];
	  	if(fields.street != ""){
	    	query.street = fields.street;
	    	query["address.street"] = query.street;
	    	delete query["street"];
	    }
	  	if(fields.building != ""){
	    	query.building = fields.building;
	    	query["address.building"] = query.building;
	    	delete query["building"];
	    }
	  	if(fields.zipcode != ""){
	    	query.zipcode = fields.zipcode;
	    	query["address.zipcode"] = query.zipcode;
	    	delete query["zipcode"];
	    }
	  	if((fields.coordx != "") && (fields.coordy != "")){
	  		query.coord = [fields.coordx, fields.coordy];
	  		query["address.coord"] = query.coord;
	    	delete query["coord"];
	  	}else if((fields.coordx != "") && (fields.coordy == "")){
	  		query.coord = fields.coordx;
	    	query["address.coord"] = query.coord;
	    	delete query["coord"];

	  	}else if((fields.coordx == "") && (fields.coordy != "")){
	  		query.coord = fields.coordy;
	    	query["address.coord"] = query.coord;
	    	delete query["coord"];

	  	}
	  	console.log(JSON.stringify(query));
	});
	MongoClient.connect(mongourl, function(err,db) {
	      try {
	        assert.equal(err,null);
	      } catch (err) {
	        res.status(500).send('MongoClient connect() failed!');
	      }
	      console.log('Connected to MongoDB');
	      findRestaurant(db, query, function(restaurant) {
	      	criteria = query;
	        db.close();
	        console.log('Disconnected MongoDB');
	        res.render('mainPage', {rest:restaurant, user:currentUser, criteria:JSON.stringify(criteria)});	      
	    });
	});
}

//Delete Restaurant
function remove(res, queryAsObject) {
	var displayRestaurantId = queryAsObject._id;
	var criteria = {};
	console.log(displayRestaurantId);
	MongoClient.connect(mongourl,function(err,db) {
		assert.equal(err,null);
		criteria['_id'] = ObjectId(displayRestaurantId);
		console.log(criteria);
		console.log('Connected to MongoDB\n');
		deleteRestaurant(db,criteria,function(result) {
			db.close();
			console.log(JSON.stringify(result));
			res.redirect('/main');		
		});
	});
}
function deleteRestaurant(db,criteria,callback) {
	db.collection('restaurants').deleteMany(criteria,function(err,result) {
		assert.equal(err,null);
		console.log("Delete was successfully");
		callback(result);
	});
}


app.listen(process.env.PORT || 8099);
