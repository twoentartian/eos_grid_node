const http = require('http');
const express = require('express');
const expressServer = express();
const fs = require('fs');
const url = require('url');

// HTTP Response (obsolete)
function response(request, response) {
	let pathname = url.parse(request.url).pathname;
	
	// Default, jump to mainPage.html
	if (pathname === '/') {
		response.writeHead(302, {'Location': './mainPage.html'});
		response.end();
	}
	else {
		fs.readFile('.' + pathname, function (err, data) {
			if (err) return console.error(err);
			let items = pathname.split('.');
			if (items[items.length - 1] === 'svg') {
				response.writeHead(200, {"content-type": "image/svg+xml"});
			}
			response.write(data);
			response.end();
		})
	}
}

//(obsolete)
function createServerHttp(port) {
	http.createServer(response).listen(port);
}

// Express server
expressServer.get('/', function (request, response) {
	var deviceAgent = request.headers['user-agent'].toLowerCase();
	var agentID = deviceAgent.match(/(iphone|ipod|android)/);
	if (agentID) {
		response.writeHead(302, {'Location': './tunnel.html'});
	}
	else {
		response.writeHead(302, {'Location': './mainPage.html'});
	}

	response.end();
});

expressServer.get('/*', function (request, response) {
	fs.readFile('.' + request.url, function (err, data) {
		if (err) return console.error(err);
		let items = request.url.split('.');
		if (items[items.length - 1] === 'svg') {
			response.writeHead(200, {"content-type": "image/svg+xml"});
		}
		response.write(data);
		response.end();
	})
});

function createServerExpress(port) {
	let server = expressServer.listen(port, function () {
	
	})
}

module.exports.createServerExpress = createServerExpress;
module.exports.createServerHttp = createServerHttp;
