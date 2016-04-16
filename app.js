var express = require('express');
var app = express();
var serv = require('http').Server(app);


app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);

var SOCKET_LIST = {};

var global_coins = 0;


var units = {
    
    "lemming" : {
        cost: 100,
        increase:50,
        buy: 10,
    },    
    "dragon" : {
        cost: 500,
        increase: 200,
        buy: 10,
    },    
    "char3" : {
        cost: 0,
        increase: 0,
        buy: 10,
    }
    
}

var Player = function(id) {
    var self = {
        id : id,
        coins: 10000,
        time : 0,
        lemming: {
            x: 0,
            y: 0,
            direction: 0,
            vertical: 0,
            status: 0,
            qty: 1,
            level: 1,            
            price: units.lemming.cost,            
            frame:0,
        },
        dragon: {
            x: 0,
            y: 0,
            direction: 0,
            vertical: 0,
            status: 0,
            qty: 0,
            level: 1,            
            price: units.dragon.cost,            
            frame:0,
        },
        char3: {
            x: 0,
            y: 0,
            direction: 0,
            status: 0,
            qty: 0,
            level: 1
        },
    }
    
    self.update = function() {
        self.time++;
        
        self.calculateCoins();
        self.moveUnits();
    }
    
    self.calculateCoins = function() {
        
        var newCoins = 0;
        
        newCoins += (units.lemming.increase * self.lemming.qty * self.lemming.level) / 24 ;
        newCoins += (units.dragon.increase * self.dragon.qty * self.dragon.level) / 24 ;
        
        self.coins += newCoins;
        self.time = 0;
    }
    
    self.moveUnits = function() {
        if (self.lemming.qty > 0) self.move('lemming');
        if (self.dragon.qty > 0) self.move('dragon');
        
    }
    
    self.move = function(type) {
        
        switch (type) {
            case 'lemming':
                
                if (self.lemming.frame == 4) self.lemming.frame = 0;
                self.lemming.frame++;
                
                if (self.lemming.x > 600) self.lemming.direction = 0;
                else if (self.lemming.x < 10) self.lemming.direction = 1;
                
                if (self.lemming.direction == 0) self.lemming.x -= 1;
                else self.lemming.x += 1;
                
                if (self.lemming.vertical == 0) self.lemming.y -= 1;
                else self.lemming.y += 1;
                
                if (self.lemming.y < 0) self.lemming.vertical = 1;
                else if (self.lemming.y > 400) self.lemming.vertical = 0;
//                
//                
//                if (Math.floor(Math.random() * 100) + 1 == 3) {                    
//                    self.lemming.vertical = Math.floor(Math.random() * 1);
//                }
//                
//                if (Math.floor(Math.random() * 100) + 1 == 3) {
//                    self.lemming.direction = 1;
//                }
                    
                break;
                
            case 'dragon':
                
                if (self.dragon.frame == 4) self.dragon.frame = 0;
                self.dragon.frame++;
                
                if (self.dragon.x > 600) self.dragon.direction = 0;
                else if (self.dragon.x < 10) self.dragon.direction = 1;
                
                if (self.dragon.direction == 0) self.dragon.x -= 1;
                else self.dragon.x += 1;
                
                if (self.dragon.vertical == 0) self.dragon.y -= 1;
                else self.dragon.y += 1;
                
                if (self.dragon.y < 0) self.dragon.vertical = 1;
                else if (self.dragon.y > 400) self.dragon.vertical = 0;
                
                break;
        }
        
    }
    
    Player.list[id] = self;
    return self;
    
}


Player.list = {};
Player.onConnect = function(socket) {
    var player = Player(socket.id);
    
    console.log("Player: " + socket.id);
    
    socket.on("test1", function(data) {
        console.log("test1: " + data);
    });
}
              
Player.onDisconnect = function(socket) {
        delete Player.list[socket.id];
}
    
    
Player.update = function() {
    
    var pack = [];        
    
    global_coins = 0;
    
    for (var i in Player.list) {
        var player = Player.list[i];
        player.update();
        
        global_coins += player.coins;

        pack.push({
            id : player.id,
            coins:formatNumber(player.coins.toFixed(2)),
            global_coins:formatNumber(global_coins.toFixed(2)),
            lemming:player.lemming,  
            dragon:player.dragon,
        })
    }
    
    return pack;
    
}

function formatNumber (num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
   socket.id = Math.random();
   SOCKET_LIST[socket.id] = socket;
    Player.onConnect(socket);
    console.log(socket.id + " connected");       
    
    socket.on('disconnect', function() {
        delete SOCKET_LIST[socket.id];
        delete Player.list[socket.id];
        
        console.log(socket.id + " disconnected");
        
    });    
    
    
    socket.emit('socketId', socket.id);
    
    socket.on('sendMsgToServer',function(data){
        var playerName = ("" + socket.id).slice(2,7);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
        }
    });
    
    socket.on('buyUnit',function(data){
        var player = Player.list[socket.id];        
                        
        switch (data) {
            case 'lemming':
                
                if (checkCost(player.coins, player.lemming.price))
                {
                    player.coins -= player.lemming.price;
                    global_coins -= player.lemming.price;
                    player.lemming.qty++;
                    player.lemming.price += units.lemming.increase * player.lemming.qty;
                }
                break;
            case 'dragon':
                
                if (checkCost(player.coins, player.dragon.price))
                {
                    player.coins -= player.dragon.price;
                    global_coins -= player.dragon.price;
                    player.dragon.qty++;
                    player.dragon.price += units.dragon.increase * player.dragon.qty;
                }
                break;
                
        }
        
        SOCKET_LIST[socket.id].emit('updateBuy',player);        
    });
    
});


function checkCost(first, second) {
//    console.log(first);
//    console.log(second);                
//    console.log(first > second);
    return first > second;
}


setInterval(function() {

    var pack = {
        player: Player.update(),
    }
    
    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('newData', pack);
    }

},1000/25);