var http = require("http");
var url = require("url");
var fs = require("fs");
var qs = require('querystring');
var SerialPort = require('serialport');

const requestIp = require('request-ip');
const ethalon_token = process.env.ETHALON_TOKEN || "TgYgtt822NeQaqLQ9XQWtFhI";
const ethalon_team_id = process.env.ETHALON_TEAM_ID || "T7J3M65J4";
const debug = true;

var port = process.env.PORT || 8081;
var logfile = "./log.txt";

var inputString = "";
var sport = new SerialPort('/dev/tty.SLAB_USBtoUART', {
	baudRate: 9600
});

sport.on('open', function() {
	console.log('Serial port opened.');
}).on('error', function(err) {
	console.log('Error: ', err.message);
});

sport.on('data', (data) => {
	if(data.slice(-1,1) == "\n") {
		console.log(inputString);
		inputString = "";
	} else {
		inputString += data.toString();
	}
});

function process_request(data) {
	if (data.token == ethalon_token && data.team_id == ethalon_team_id) {
		log_opener(data.user_id, data.command, "authiorized");
		if (data.command == "/door_cafe" || data.command == "/t") {
			open_door("door_cafe");
			return [true, "Opening CAFE side door"];
		} else if (data.command == "/door_smoke" || data.command == "/y") {
			open_door("door_smoke");
			return [true, "Opening SMOKE exit side door"];
		} else if (data.command == "/door_sortir" || data.command == "/u") {
			open_door("door_sortir");
			return [true, "Opening SORTIR side door"];
		// } else if (data.command == "/n") {
		// 	sport.close(function (err) { console.log("serial port closed " + err) });
		// 	return [true, "Serial port closed"];
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

function open_door(door) {
	sport.write(door + "\n", function(err) {
		if (err) {
			return console.log('Error on write: ', err.message);
		}
		console.log('Asking to open the ' + door);
	});
}

function log_opener(user, command, auth) {}

http.createServer(function (request, response) {
	// Send the HTTP header 
	// HTTP Status: 200 : OK
	// Content Type: text/plain
	response.writeHead(200, {'Content-Type': 'text/plain'});
	

	// var query = url.parse(request.url,true).query;
	// response.end(request.url);
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

