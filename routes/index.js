var express = require('express');
var router = express.Router();

module.exports.getRouter = function(io){

	router.get('/', function(req, res, next) {
		res.render('index.html');
	});

	var blobs = [];
	var foods = [];
	var foodAmount = (3000*3000)/1000;
	var blobCount = 0;
	var allColors = ["red","green","blue","orange","yellow","purple","cyan","magenta"];
	var percent = 0.1;

	io.on('connection', function(socket){
		console.log("Blob " + blobCount + " connected");
		var newId = blobCount++;
		var loc = generateLoc();
		blobs[blobs.length] = {x: loc.x, y: loc.y, mass: Math.floor((Math.random() * 20) + 5), color: allColors[newId % allColors.length], id: newId, name: "Mr.Duck"};
		var response = {blobs: blobs, blobId: newId, foods: foods};
		socket.emit('ready',response);
		socket.on('disconnect',function(){
			for (var i = 0; i < blobs.length;i++){
				if (blobs[i].id == newId){
					blobs.splice(i,1);
					console.log("Blob " + newId + " disconnected and removed.");
				}
			}
		});
		socket.on('objUpdate',function(obj){
			for (var i = 0; i < blobs.length; i++){
				if (blobs[i].id == obj.id){
					var dx = obj.dir.dx;
					var dy = obj.dir.dy;
					var dist = Math.sqrt(dx*dx+dy*dy);
					//var slope = dy/dx;
					//var intercept = obj.y - (slope*obj.x);
					var speed = obj.speed;
					if(dist>5){
						if (0 <= blobs[i].x + dx/speed && 3000 >= blobs[i].x + dx/speed){
							blobs[i].x = blobs[i].x + (dx/dist)*speed;
							//blobs[i].x = ((blobs[i].x+speed)-intercept)/slope;
						}
						if (0 <= blobs[i].y + dy/speed && 3000 >= blobs[i].y + dy/speed){
							blobs[i].y = blobs[i].y + (dy/dist)*speed;
							//blobs[i].y = slope*(blobs[i].y+speed)+intercept;
						}
					}
					break;


				}
			}
		});
	});
	var generateFood = function(){
		var loc = generateLoc();
		return {x: loc.x, y: loc.y, mass: 5, color: allColors[Math.floor(Math.random() * (allColors.length))]};
	};
	var generateLoc = function(){
		var good = true;
		do{
			loc = {x: Math.floor((Math.random() * 3000) + 0), y: Math.floor((Math.random() * 3000) + 0)};
			for (var i = 0; i < blobs.length; i++){
				if (inside(loc,blobs[i])){
					good = false;
				}
			}
		}while(!good);
		return loc;
	};
	// O(n^2) should probably improve
	var checkEating = function(){
		for (var i = 0; i < blobs.length; i++) {
			for (var j = 0; j < blobs.length; j++) {
				// Checking for the eating of blobs that haven't already been eaten.
				if (i != j && !blobs[i].eaten && !blobs[j].eaten && inside(blobs[j],blobs[i])){
					console.log("Doing eating of " + blobs[j].id  + " by " + blobs[i].id);
					blobs[i].mass += blobs[j].mass;
					blobs[j].eaten = true; //Mark blob for deletion
				}
			}
			for (var k = 0; k < foods.length; k++) {
				if (!foods.eaten && inside(foods[k],blobs[i])){
					blobs[i].mass += foods[k].mass;
					foods[k].eaten = true;
				}
			}
		}
		//Remove eaten blobs (we loop in reverse to avoid the trouble of index changes)
		for (var l = blobs.length - 1; l >= 0; l--) {
			if (blobs[l].eaten){
				// console.log("Killing blob: " + blobs[l].id);
				io.emit('death'+blobs[l].id,blobs[l]);
				blobs.splice(l,1);
			}
		}
		for (var m = foods.length - 1; m >= 0; m--) {
			if (foods[m].eaten){
				foods.splice(m,1);
			}
		}
	};
	var fillFoods = function(){
		for (var i = foods.length; i < foodAmount; i++) {
			foods[i] = generateFood();
		}
	};
	//checks if a is inside b
	var inside = function(a,b){
		var distance = Math.sqrt(Math.pow((b.x - a.x),2) + Math.pow((b.y - a.y),2));
		if (distance < b.mass - a.mass){
			return true;
		}
		return false;
	};
	//This is our 'game loop' implemented as a callback loop.
	var sendData = function(){
		checkEating();
		fillFoods();
		io.emit('update',{blobs: blobs, foods: foods});
		setTimeout(sendData,20);
	};
	fillFoods();
	sendData();

	return router;
};
