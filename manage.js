var db = require('node-localdb');
var users = db('./users.json');
var http = require("http");

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