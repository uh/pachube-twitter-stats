var express = require('express');
var url = require('url');
var http = require('http');
var request = require('request');

var app = express.createServer(express.logger());

app.get('/', function(request, response) {

	  getPage("https://api.twitter.com/1/users/lookup.json?screen_name=uah", function(body) {
	  
      response.writeHead(200, {"Content-Type": "text/plain"});
      var message = "";
      
      var tweets_json = JSON.parse(body);
      var tweets = "";
			if(tweets_json.length > 0) {
				tweets = tweets_json[0];
				message = tweets.id_str;
			}
      
      
      
      response.write(body);
      response.end("\n\n\n---------finished" + message);
      
      
      
      
    });


  //response.send('Hello World!');
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});



function getPage (someUri, callback) {
  request({uri: someUri}, function (error, response, body) {
      console.log("Fetched " +someUri+ " OK!");
      callback(body);
    });
}

