var http = require("http");
var fs = require("fs");
var qs = require("querystring");
var gpio = require("rpi-gpio");
var requestIp = require("request-ip");

const debug = true;

const ethalon_token = process.env.BACKDOOR_ETHALON_TOKEN;
const ethalon_team_id = process.env.BACKDOOR_ETHALON_TEAM_ID;
var port = process.env.BACKDOOR_PORT || 8081;

// CAFE, SMOKE, SORTIR
const gpios = [11,13,15];
var gpios_ready_states = [false, false, false];

var logfile = "./log.txt";
var inputString = "";

function gpio_init () {
	gpio.destroy(function() {
		console.log('All pins unexported.');
	});
	for (var i = 0; i < gpios.length; i++) {
		gpios_ready_states[i] = false;
		gpio.setup(gpios[i], gpio.DIR_OUT, function () {
			gpios_ready_states[i] = true;
		});
	}
}
gpio_init();

function process_request(data) {
	if (data.token == ethalon_token && data.team_id == ethalon_team_id) {
		log_opener(data.user_id, data.command, "authiorized");
		if (data.command == "/door_cafe" || data.command == "/t") {
			open_door(0);
			return [true, "Opening CAFE side door"];
		} else if (data.command == "/door_smoke" || data.command == "/y") {
			open_door(1);
			return [true, "Opening SMOKE side door"];
		} else if (data.command == "/door_sortir" || data.command == "/u") {
			open_door(2);
			return [true, "Opening SORTIR side door"];
		} else {
			if (debug) { console.log("wrong command"); }
			log_opener(data.user_id, data.command, "wrong command");
			return [false, "wrong command"];
		}
	} else {
		if (debug) { console.log("not authorized"); }
		log_opener(data.user_id, data.command, "not authorized");
		return [false, "not authorized"];
	}
}

function open_door(door_id) {
	if (gpios_ready_states[door_id]) {
		gpio.write(gpios[door_id], 1, function(err) {
			if (err) {
				console.log('Error on GPIO write 1: ', err.message);
			}
			console.log('Asking to open door #' + door_id);
		}).then(function () {
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

function log_opener(user, command, auth) {}

http.createServer(function (request, response) {
	// Send the HTTP header 
	// HTTP Status: 200 : OK
	// Content Type: text/plain
	response.writeHead(200, {'Content-Type': 'text/plain'});
	
	if(request.method=='POST') {
		var body='';
		request.on('data', function (data) {
			body += data;
		});
		request.on('end',function(){
			var obj = qs.parse(body);
			if (debug) { console.log(obj); }
			var processing_result = process_request(obj);
			if (processing_result[0]) {
				response.end(processing_result[1]);
			} else {
				response.end(":pashak:");
			}
		});
	} else {
		response.end("nothing");
	}

	var IP = requestIp.getClientIp(request);
	var time = (new Date).toLocaleTimeString();
	console.log(IP + ": " + time + ": " + request.url);
}).listen(port);

// Console will print the message
console.log('Server running at port ' + port + '; Token: ' + ethalon_token + ' Team ID: ' + ethalon_team_id + '.');

