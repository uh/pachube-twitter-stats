var express = require('express');
var url = require('url');
var http = require('http');
var request = require('request');

if(process.env.REDISTOGO_URL){
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  var rtg_pass = rtg.auth.split(':')[1]
  var redis = require("redis").createClient(rtg.port, rtg.hostname);
  redis.auth(rtg_pass, function(){console.log("connected to redis");});
}else{
  var redis = require("redis").createClient();
}

var oauth = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  token: process.env.TOKEN,
  token_secret: process.env.TOKEN_SECRET
}

var app = express.createServer(express.logger());

app.get('/:username',
  // Success handling function
  function(request, response) {
    var now_time = Math.floor(Date.now()/1000);
    var username =  request.params.username;

    redis.hgetall(username, function(err, result){
      if(result != undefined && now_time - result.last_fetched < 3600){
        //serve the cached result
        response.writeHead(200, {"Content-Type": "application/json"});
        response.write(result.content);
        response.end("");
      }else{
        //fetch the twitter stats
        getPage("https://api.twitter.com/1/users/lookup.json?screen_name="+username, function(body) {
          
          var tweets_json = JSON.parse(body);
          var pachube = {};
          
          if(tweets_json.length > 0) {
            var tweets = tweets_json[0];
            
            var name = tweets.name || '';
            var description = tweets.description || '';
            var location = tweets.location || '';
            var screen_name = tweets.screen_name || '';
            var geolocated = false;
            var lat = null;
            var lon = null;
            
            var metrics = {
              favourites: tweets.favourites_count,
              followers: tweets.followers_count,
              lists: tweets.listed_count,
              tweets: tweets.statuses_count,
              friends: tweets.friends_count,
              followers_to_friends_ratio: tweets.followers_count/tweets.friends_count
            }
            
            if ((typeof (tweets.status) != "undefined") && (tweets.status != null)) {
              if ((typeof (tweets.status.geo) != "undefined") && (tweets.status.geo != null)) {
                if ((typeof (tweets.status.geo.coordinates) != "undefined") && (tweets.status.geo.coordinates != null)) {
                  if ((typeof (tweets.status.geo.coordinates[0]) != "undefined") && (tweets.status.geo.coordinates[0] != null) && (typeof (tweets.status.geo.coordinates[1]) != "undefined") && (tweets.status.geo.coordinates[1] != null)) {
                    
                    lat = tweets.status.geo.coordinates[0];
                    lon = tweets.status.geo.coordinates[1];
                    
                    geolocated = true;
                    
                  }
                }
              }
            }
          
            pachube = {
              title: "Twitter stats for " + name,
              description: "Twitter stats for " + name + " (@" + screen_name + ")" + (description ? ': ' + description : ''),
              location: { name: location, domain: "virtual"},
              version: "1.0.0",
              datastreams: [],
              tags: ["twitter", "twitter_stats"]
            }
            
            var metric_types = ["followers", "friends", "lists", "tweets", "favourites", "followers_to_friends_ratio"];
            
            for(var i = 0; i< metric_types.length; i++){
              pachube.datastreams[i] = {
                id: metric_types[i],
                current_value: String(metrics[metric_types[i]]),
                min_value: "0",
                unit: {label: metric_types[i]}
              };
            }
            
            if (geolocated){
              pachube.location.lat = String(lat);
              pachube.location.lon = String(lon);            
              pachube.datastreams[i+1] = {id: "latitude", current_value: String(lat)};
              pachube.datastreams[i+2] = {id: "longitude", current_value: String(lon)};
            }
            redis.hset(username, 'last_fetched', now_time);
            redis.hset(username, 'content', JSON.stringify(pachube));
            redis.expire(username, 86400);
            response.write(JSON.stringify(pachube));
          }else{
            if(result != undefined){
              response.writeHead(200, {"Content-Type": "application/json"});
              response.write(result.content);
            }else{
              response.writeHead(404);
            }
          }
          response.end("");
        },
        
        // Error handling function
        function(statusCode, body){
          if(result.content != undefined){
            response.writeHead(200, {"Content-Type": "application/json"});
            response.write(result.content);
          }else{
            response.writeHead(statusCode, {"Content-Type": "application/json"});
            response.write(body);
          }
          response.end("");
        });
      }
    });
  }
);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

function getPage (someurl, callback, errback) {
  request({uri: someurl, oauth: oauth}, function (error, response, body) {
    if(response.statusCode == 200){
      callback(body);
    }else{
      errback(response.statusCode, body);
    }
  });
}
