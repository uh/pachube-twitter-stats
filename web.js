var express = require('express');
var url = require('url');
var http = require('http');
var request = require('request');

var app = express.createServer(express.logger());

app.get('/:username',
  // Success handling function
  function(request, response) {
    
    var username =  request.params.username;

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
      }
      
      response.writeHead(200, {"Content-Type": "application/json"});
      response.write(JSON.stringify(pachube));
      response.end("");
    },
    
    // Error handling function
    function(statusCode, body){
      response.writeHead(statusCode, {"Content-Type": "application/json"});
      response.write(body);
    });
  }
);

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

function getPage (someurl, callback, errback) {
  request({uri: someurl}, function (error, response, body) {
    if(response.statusCode == 200){
      callback(body);
    }else{
      errback(response.statusCode, body);
    }
  });
}
