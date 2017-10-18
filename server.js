var http = require("http");
var url = require("url");
var fs = require("fs");
const requestIp = require('request-ip');

var port = process.env.PORT || 8081;
var logfile = "./log.txt";

http.createServer(function (request, response) {
	// Send the HTTP header 
	// HTTP Status: 200 : OK
	// Content Type: text/plain
	response.writeHead(200, {'Content-Type': 'application/x-www-form-urlencoded'});
	

	// var query = url.parse(request.url,true).query;
	// response.end(request.url);
	response.end('L7qoNain1Tltuu2nKZPQDAnVRXcUDiysuw4QpCAYvbQpI4Zetr5V');


	var IP = requestIp.getClientIp(request);
	var time = (new Date).toLocaleTimeString();
	console.log(IP + ": " + time + ": " + request.url);
}).listen(port);

// Console will print the message
console.log('Server running at http://127.0.0.1:' + port + '/');

