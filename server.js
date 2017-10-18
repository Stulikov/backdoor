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
	response.writeHead(200, {'Content-Type': 'text/plain'});
	

	// var query = url.parse(request.url,true).query;
	response.end(request.url);

	var IP = requestIp.getClientIp(request);
	var time = (new Date).toLocaleTimeString();
	console.log(IP + ": " + time + ": " + request.url);
	// Writing request to the log
	// fs.open("log", "a", 0666, function(err, file_handle) {
	// 	if (!err) {
	// 		fs.write(file_handle, IP + ": " + time + ": " + request.url + "\n\r", null, 'UTF8', function(err, written) {});
	// 	}
	// 	fs.close(file_handle);
	// });
}).listen(port);

// Console will print the message
console.log('Server running at http://127.0.0.1:' + port + '/');



//The url we want is: 'www.random.org/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
// var options = {
// 	host: 'www.random.org',
// 	path: '/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
// };

// callback = function(response) {
// 	var str = '';

// 	//another chunk of data has been recieved, so append it to `str`
// 	response.on('data', function (chunk) {
// 		str += chunk;
// 	});

// 	//the whole response has been recieved, so we just print it out here
// 	response.on('end', function () {
// 		console.log(str);
// 	});
// }

// http.request(options, callback).end();



