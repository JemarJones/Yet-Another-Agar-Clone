var express = require('express');
var router = express.Router();
//var quadtree = require('../local/Quadtree.js');

module.exports.getRouter = function(io){

    router.get('/', function(req, res, next) {
        res.render('index.html');
    });
    var fieldW = 2500;
    var fieldH = 2500;
    //------------------F6: Entity Data-------------------------------
    var blobs = [];
    var foods = [];
    //------------------F6 End-------------------------------
    //var foodAmount = (3001*3001)/10000;
    var foodAmount = 200;
    var foodIdCount = 0;
    var foodMass = 100;
    var blobCount = 0;
    var allColors = ["red","green","blue","orange","yellow","purple","cyan","magenta"];
    var percent = 0.1;
    // var quad = new quadtree.Quadtree(0,{x:0,y:0,width:fieldW,height:fieldH});

    //------------------F7: Server Integration-------------------------------
    io.on('connection', function(socket){
        console.log("Blob " + blobCount + " connected");
        var loc = generateLoc();
        socket.emit('init',{width: fieldW, height: fieldH, x: loc.x, y: loc.y, foods: foods});
        socket.on('playerReady',function(data){
            var newId = blobCount++;
            blobs[blobs.length] = {x: loc.x, y: loc.y, mass: 1256,radius: convertToRadius(1256), color: allColors[newId % allColors.length], id: newId, name: data.name, score: 0, powerup: 0};
            //special color
            if (data.name.indexOf("smith") > -1 || data.name.indexOf("Smith") > -1 || data.name.indexOf("spence") > -1 || data.name.indexOf("Spence") > -1) blobs[blobs.length-1].color = "smith";
            var response = {blobs: blobs, blobId: newId};
            socket.emit('ready',response);
            socket.on('disconnect',function(){
                for (var i = 0; i < blobs.length;i++){
                    if (blobs[i].id == newId){
                        blobs.splice(i,1);
                        console.log("Blob " + newId + " disconnected and removed.");
                    }
                }
            });
        });
        socket.on('objUpdate',function(obj){
            for (var i = 0; i < blobs.length; i++){
                if (blobs[i].id == obj.id){
                    var dx = obj.dir.dx;
                    var dy = obj.dir.dy;
                    var dist = Math.sqrt(dx*dx+dy*dy);
                    var takeMod = 1;
                    var ceilMod = 0;
                    var speed = (10+ceilMod)-((((obj.mass*takeMod)*24)/(obj.radius*takeMod))/1000);
                    takeMod -= 0.001;
                    ceilMod += 0.01;
                    console.log(speed);
                    if (blobs[i].powerup) speed+=2;

                    if(dist>5){
                        if (0 <= blobs[i].x + dx/speed && fieldW >= blobs[i].x + dx/speed){
                            if (dist<blobs[i].radius) blobs[i].x = blobs[i].x + (dx/blobs[i].radius)*speed;
                            else blobs[i].x = blobs[i].x + (dx/dist)*speed;
                        }
                        if (0 <= blobs[i].y + dy/speed && fieldH >= blobs[i].y + dy/speed){
                            if (dist<blobs[i].radius) blobs[i].y = blobs[i].y + (dy/blobs[i].radius)*speed;
                            else blobs[i].y = blobs[i].y + (dy/dist)*speed;
                        }
                    }
                    break;


                }
            }
        });
    });
    //------------------F7 End-------------------------------

    //------------------F5: State Calculation-------------------------------
    var convertToRadius = function(mass){
        return Math.floor(Math.sqrt(mass/Math.PI));
    };
    var generateFood = function(foodId){
        var loc = generateLoc();
        var powerup = false;
        if (Math.floor(Math.random()*(foodAmount/3))==0){
            powerup = true;
            console.log("powerup!!");
        }
        return {id: foodId, x: loc.x, y: loc.y, mass: foodMass, radius: convertToRadius(foodMass), color: allColors[Math.floor(Math.random() * (allColors.length))], powerup: powerup};
    };
    var generateLoc = function(id){
        var good = true;
        do{
            loc = {x: Math.floor((Math.random() * fieldW) + 0), y: Math.floor((Math.random() * fieldH) + 0)};
            for (var i = 0; i < blobs.length; i++){
                if (inside(loc,blobs[i])){
                    good = false;
                }
            }
        }while(!good);
        return loc;
    };

    var checkEating = function(){
        if (blobs.length > 0){
            // quad.clear();
            // for (var i = 0; i < blobs.length; i++) {
            //  quad.insert(blobs[i]);
            // }
            // for (var k = 0; k < foods.length; k++) {
            //  quad.insert(foods[k]);
            // }

            // for (var i = 0; i < blobs.length; i++) {
            //  var objsToCheck = [];
            //  objsToCheck = quad.retrieve(objsToCheck,blobs[i]);
            //  for (var j = 0; j < objsToCheck.length; j++) {
            //      if (blobs[i].id != objsToCheck[j].id && !blobs[i].eaten && !objsToCheck[j].eaten && inside(objsToCheck[j],blobs[i])){
            //          blobs[i].score += objsToCheck[j].radius;
            //          blobs[i].mass += objsToCheck[j].mass;
            //          blobs[i].radius = convertToRadius(blobs[i].mass);
            //          objsToCheck[j].eaten = true; //Mark blob for deletion
            //      }
            //  };
            // }

            for (var i = 0; i < blobs.length; i++) {
                for (var j = 0; j < blobs.length; j++) {
                    // Checking for the eating of blobs that haven't already been eaten.
                    if (i != j && !blobs[i].eaten && !blobs[j].eaten && inside(blobs[j],blobs[i])){
                        console.log("Doing eating of " + blobs[j].id  + " by " + blobs[i].id);
                        blobs[i].score += blobs[j].radius;
                        blobs[i].mass += blobs[j].mass;
                        blobs[i].radius = convertToRadius(blobs[i].mass);
                        blobs[j].eaten = true; //Mark blob for deletion
                    }
                }
                for (var k = 0; k < foods.length; k++) {
                    if (!foods.eaten && inside(foods[k],blobs[i])){
                        if (foods[k].powerup){
                            blobs[i].powerup+=4000;
                        }
                        else {
                            blobs[i].score += foods[k].radius;
                            blobs[i].mass += foods[k].mass;
                            blobs[i].radius = convertToRadius(blobs[i].mass);
                        }
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
            var eatenFoods = [];
            for (var m = foods.length - 1; m >= 0; m--) {
                if (foods[m].eaten){
                    eatenFoods[eatenFoods.length] = foods[m].id;
                    foods.splice(m,1);
                }
            }
            return eatenFoods;
        }
    };
    var fillFoods = function(){
        var newFoods = [];
        for (var i = foods.length; i < foodAmount; i++) {
            foods[i] = generateFood(foodIdCount++);
            newFoods[newFoods.length] = foods[i];
        }
        return newFoods;
    };
    //checks if a is inside b
    var inside = function(a,b){
        var distance = Math.sqrt(Math.pow((b.x - a.x),2) + Math.pow((b.y - a.y),2));
        if (distance < b.radius - a.radius){
            return true;
        }
        return false;
    };

    var updatePowerups = function(){
        for (var i = 0; i < blobs.length; i++) {
            if (blobs[i].powerup){
                blobs[i].powerup -= 20;
            }
        };
    }
    //------------------F5 End-------------------------------

    //------------------F7: Server Integration-------------------------------
    //This is our 'game loop' implemented as a callback loop.
    var sendData = function(){
        var eatenFoods = checkEating();
        var newFoods = fillFoods();
        io.emit('update',{blobs: blobs,newFoods: newFoods,eatenFoods: eatenFoods});
        //io.emit('update',{blobs: blobs,foods:foods});
        updatePowerups();
        setTimeout(sendData,20);

    };
    // fillFoods();
    sendData();

    return router;
    //------------------F7 End-------------------------------
};
