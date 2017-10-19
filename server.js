var http = require("http");
var url = require("url");
var fs = require("fs");
var qs = require('querystring');
const requestIp = require('request-ip');

var port = process.env.PORT || 8081;
var logfile = "./log.txt";

http.createServer(function (request, response) {
	// Send the HTTP header 
	// HTTP Status: 200 : OK
	// Content Type: text/plain
	// response.writeHead(200, {'Content-Type': 'application/x-www-form-urlencoded'});
	response.writeHead(200, {'Content-Type': 'text/plain'});
	

	// var query = url.parse(request.url,true).query;
	response.end(request.url);
	// if(request.method=='POST') {
	// var body='';
	// 	request.on('data', function (data) {
	// 		body +=data;
	// 	});
	// 		request.on('end',function(){
	// 		var obj = JSON.parse(body);
	// 		console.log(obj);
	// 		console.log(obj.challenge);
	// 		response.end(obj.challenge);
	// 	});
	// }

	var IP = requestIp.getClientIp(request);
	var time = (new Date).toLocaleTimeString();
	console.log(IP + ": " + time + ": " + request.url);
}).listen(port);

// Console will print the message
console.log('Server running at http://127.0.0.1:' + port + '/');

