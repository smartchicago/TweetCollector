var dateFormat = require("dateformat");
var conf = require("../config/config.js");
var OAuth = require('oauth');

var collections = [conf.destinationCollection];
var db = require("mongojs").connect(conf.mongodb, collections);

console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Starting run...")

/*Get the largest id in the current collection */
db.collection(conf.destinationCollection).find({},{id_str:1}).sort({id:-1}).limit(1, function(err, maxTweet) {
	if (err)
	{
		/*If err, something is wrong with Mongo, exit*/
  		console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Database getMaxTweet error! "+err);
	}
	else {
		console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Forming request. Max Id: "+maxTweet[0].id_str)
		var url = 'https://api.twitter.com/1.1/search/tweets.json?q='+conf.searchPhrase+'&geocode='+conf.boundingBox+','+conf.radius+'km&rpp='+conf.pagesToReturn+'&since_id='+maxTweet[0].id_str;

		var oauth = new OAuth.OAuth(
		      'https://api.twitter.com/oauth/request_token',
		      'https://api.twitter.com/oauth/access_token',
		      conf.twitter.consumerKey,
		      conf.twitter.consumerSecret,
		      '1.0A',
		      null,
		      'HMAC-SHA1'
		    );

		oauth.get(
		      url,
		      conf.twitter.accessTokenKey,
		      conf.twitter.accessTokenSecret,
		      function (e, data, res) {
			   if (e) console.error(e);
			   var tweetResponse = JSON.parse(data);
			   tweetResponse.statuses.forEach(function(tweet) {
			   db.collection(conf.destinationCollection).findOne({id_str:tweet.id_str},function(err,atweet){
				if (err) {
					console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Insert error: "+err)
				}
				if (atweet) {
				        console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Existing Tweet: "+tweet.id_str) // Print the tweet.
				}
				else {
				        console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Adding Tweet: "+tweet.id_str) // Print the tweet.
				        tweet.jDate = new Date(tweet.created_at);
				        tweet.from_user = tweet.user.screen_name;
				        //var encodedText =
				        db.collection(conf.destinationCollection).insert(tweet,function(err) {
				                if (err) {
				                        console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Error: "+err);
				                } 
				        });

				}


			     });
			   });
		       }
		);
	}
});

setTimeout(function(){
  process.exit(0);
}, 10000);

