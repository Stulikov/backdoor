var http = require("http");
var fs = require("fs");
var qs = require("querystring");
var gpio = require("rpi-gpio");
var requestIp = require("request-ip");
var db = require('node-localdb');

const debug = true;

const ethalon_token = process.env.BACKDOOR_ETHALON_TOKEN;
const ethalon_team_id = process.env.BACKDOOR_ETHALON_TEAM_ID;
var port = process.env.BACKDOOR_PORT || 8081;

// CAFE, SMOKE, SORTIR
const gpios = [11,13,15];
var gpios_ready_states = [false, false, false];

var logfile = "./log.txt";
var users = db('./users.json');
var inputString = "";

function gpio_init () {
	gpio.destroy(function() {
		console.log('All pins unexported.');
	});
	for (var i = 0; i < gpios.length; i++) {
		gpios_ready_states[i] = false;
		gpio.setup(gpios[i], gpio.DIR_OUT, gpio.EDGE_NONE, function () {
			gpios_ready_states[i] = true;
		});
	}
}
gpio_init();

function add_user(user_id, user_name, callback) {
	users.findOne({userid: user_id}).then(function(u){
		if(u) {
			if(u.access) {
				callback([false, "User already exist, access denied."]);
			} else {
				callback([false, "User already exist, access allowed."]);
			}
		} else {
			users.insert({ userid: user_id, username: user_name, access: false}).then(function(au){
				console.log("Added user: " + au);
				callback([true, "Added user: " + au]);
			});
		}
	});
}

function access_allowed(data, db_callback) {
	var result = 0;
	if (data.token == ethalon_token && data.team_id == ethalon_team_id) {
		result = 1;
	}
	users.findOne({userid: data.user_id}).then(function(u){
		if(u) {
			if(u.access) {
				result = 2;
			}
		}
		db_callback(result);
	});
}

function process_request(data, IP, callback) {
	access_allowed(data, function(result) {
		if (result==2) {
			log_opener("IP: " + IP + " user_id: " + data.user_id + "; parsed command: " + data.command + "; auth result: authorized; request.url: " + request.url);
			if (data.command == "/door_cafe" || data.command == "/t") {
				open_door(0);
				callback([true, "Opening CAFE side door"]);
			} else if (data.command == "/door_smoke" || data.command == "/y") {
				open_door(1);
				callback([true, "Opening SMOKE side door"]);
			} else if (data.command == "/door_sortir" || data.command == "/u") {
				open_door(2);
				callback([true, "Opening SORTIR side door"]);
			} else {
				if (debug) { console.log("wrong command"); }
				log_opener("IP: " + IP + " user_id: " + data.user_id + "; parsed command: " + data.command + "; auth result: authorized, wrong command; request.url: " + request.url);
				callback([false, "wrong command"]);
			}
		} else if (result==1 && data.command == "/give_me_access_to_doors") {
			add_user(data.user_id, data.user_name, callback);
		} else {
			if (debug) { console.log("not authorized"); }
			log_opener(data.user_id, data.command, "not authorized", IP);
			callback([false, "not authorized"]);
		}
	});
}

function open_door(door_id) {
	if (gpios_ready_states[door_id]) {
		gpio.write(gpios[door_id], 1, function(err) {
			if (err) {
				console.log('Error on GPIO write 1: ', err.message);
			}
			console.log('Asking to open door #' + door_id);

			setTimeout(function () {	
				gpio.write(gpios[door_id], 0, function(err) {
					if (err) { 
						console.log('Error on GPIO write 0: ', err.message);
					}
				});
			}, 200);
		});
	} else {
		console.log("GPIO port #" + gpios[door_id] + " isn't ready to operate.");
	}
}

function log_opener(line) {
	var time = (new Date).toLocaleTimeString();
	fs.appendFile(logfile, time + " " + line, function (err) {
		if (err) throw err;
	});
	if (debug) {
		console.log(time + ": " + line);
	}
}

http.createServer(function (request, response) {
	response.writeHead(200, {'Content-Type': 'text/plain'});
	
	if(request.method=='POST') {
		var body='';
		request.on('data', function (data) {
			body += data;
		});
		request.on('end',function(){
			var obj = qs.parse(body);
			if (debug) { console.log(obj); }
			var IP = requestIp.getClientIp(request);
			process_request(obj, IP, function (result) {
				if (result[0]) {
					response.end(result[1]);
				} else {
					response.end(":pashak:");
				}
			});
		});
	} else {
		response.end("nothing");
	}
}).listen(port);

console.log('Server running at port ' + port + '; Token: ' + ethalon_token + ' Team ID: ' + ethalon_team_id + '.');

