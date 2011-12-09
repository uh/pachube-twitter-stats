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
      
      response.writeHead(200, {"Content-Type": "application/json"});
      var name = "";
      var username = "";
      var description = "";
      var location = "";
      var favourites_count = 0;
      var followers_count = 0;
      var listed_count = "";
      var statuses_count = 0;
      var friends_count = 0;
      var geolocated = false;
      var lat = null;
      var lon = null;
      
      var active = false;
      
      var tweets_json = JSON.parse(body);
      
      var tweets = "";
      if(tweets_json.length > 0) {
        tweets = tweets_json[0];
        
        name = tweets.name;
        screen_name = tweets.screen_name;
        description = tweets.description;
        location = tweets.location;
        favourites_count = tweets.favourites_count;
        followers_count = tweets.followers_count;
        listed_count = tweets.listed_count;
        statuses_count = tweets.statuses_count;
        friends_count = tweets.friends_count;
        
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
        
        active = true;
      }
        
      var message = "";
      var pachube = {};
      
      if (active){
        pachube.title = "Twitter stats for " + name;
        pachube.description = "Twitter stats for " + name + " (@" + screen_name + ")"
        if(description){
          pachube.description += description;
        }
        pachube.location = { name: location, domain: "virtual"};
        pachube.version = "1.0.0";
        pachube.datastreams = [];
        pachube.tags = [];
        pachube.tags[0] = "twitter";
        pachube.tags[1] = "twitter_stats";
        
        pachube.datastreams[0] = {};
        pachube.datastreams[0].id = "followers";        
        pachube.datastreams[0].current_value = String(followers_count);
        pachube.datastreams[0].min_value = "0";
        pachube.datastreams[0].unit = {};
        pachube.datastreams[0].unit.label = "followers";
        
        pachube.datastreams[1] = {};
        pachube.datastreams[1].id = "friends";        
        pachube.datastreams[1].current_value = String(friends_count);
        pachube.datastreams[1].min_value = "0";
        pachube.datastreams[1].unit = {};
        pachube.datastreams[1].unit.label = "friends";
        
        pachube.datastreams[2] = {};
        pachube.datastreams[2].id = "lists";        
        pachube.datastreams[2].current_value = String(listed_count);
        pachube.datastreams[2].min_value = "0";
        pachube.datastreams[2].unit = {};
        pachube.datastreams[2].unit.label = "lists";
        
        pachube.datastreams[3] = {};
        pachube.datastreams[3].id = "tweets";        
        pachube.datastreams[3].current_value = String(statuses_count);
        pachube.datastreams[3].min_value = "0";
        pachube.datastreams[3].unit = {};
        pachube.datastreams[3].unit.label = "tweets";
        
        pachube.datastreams[4] = {};
        pachube.datastreams[4].id = "favourites";        
        pachube.datastreams[4].current_value = String(favourites_count);
        pachube.datastreams[4].min_value = "0";
        pachube.datastreams[4].unit = {};
        pachube.datastreams[4].unit.label = "favourites";
        
        var followers_friends_ratio = followers_count/friends_count;
        
        pachube.datastreams[5] = {};
        pachube.datastreams[5].id = "followers_to_friends_ratio";        
        pachube.datastreams[5].current_value = String(followers_friends_ratio);
        pachube.datastreams[5].min_value = "0";
        
        if (geolocated){
          pachube.location.lat = String(lat);
          pachube.location.lon = String(lon);
            
          pachube.datastreams[6] = {};
          pachube.datastreams[6].id = "latitude";        
          pachube.datastreams[6].current_value = String(lat);
          
          pachube.datastreams[7] = {};
          pachube.datastreams[7].id = "longitude";        
          pachube.datastreams[7].current_value = String(lon);
        }
      }
      
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
