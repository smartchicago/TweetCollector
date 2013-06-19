var Twit = require('twit')
var dateFormat = require("dateformat");
var args = process.argv.splice(2);
if (args.length == 0) {
	console.log("Error: Must pass configuration file in as first argument");
	process.exit(1);
}
var conf = require(args[0]);
var collections = [conf.destinationCollection];
var db = require("mongojs").connect(conf.mongodb, collections);


var T = new Twit({
        consumer_key: conf.twitter.consumerKey,
        consumer_secret: conf.twitter.consumerSecret,
        access_token: conf.twitter.accessTokenKey,
        access_token_secret: conf.twitter.accessTokenSecret
})

function getTweets(srch) {
	T.get('search/tweets', srch, function(err, reply) {
		reply.statuses.forEach(function(tweet) {
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
					db.collection(conf.destinationCollection).insert(tweet,function(err) {
						if (err) {
							console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Write Error: "+err);
						} 
					});
				}
			 });
		});
		setTimeout(function(){
		  process.exit(0);
		}, 10000);
	});
}

if (typeof(conf.boundingBox) !== 'undefined') {
	var stream = T.stream('statuses/filter', { locations: conf.boundingBox});
	}
else if (typeof(conf.streamFilterOn) !== 'undefined') {
	var stream = T.stream('statuses/filter', { track: conf.streamFilterOn})
	}
else {
	var srch = {};
	if (typeof(conf.searchFilterOn)!=='undefined') {
		srch.q=conf.searchFilterOn;
	}
	if ((typeof(conf.searchCenter)!=='undefined') && (typeof(conf.searchRadius)!=='undefined')) {
		srch.geocode=conf.searchCenter+','+conf.searchRadius+'km';
	}
	if (typeof(conf.searchPages)!=='undefined') {
		srch.rpp=conf.searchPages;
	}
	if (typeof(conf.searchLatest)!=='undefined') {
		if (conf.searchLatest == true) {
			db.collection(conf.destinationCollection).find({},{id_str:1}).sort({id:-1}).limit(1, function(err, maxTweet) {
				if (err) console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Database getMaxTweet error! "+err);
				else srch.since_id = maxTweet[0].id_str;
				getTweets(srch);
			});
		}
		else {
			getTweets(srch);
		}
	}
	else {
		getTweets(srch);
	}
} //else

if (typeof(stream) !== 'undefined')
{
	stream.on('tweet', function (tweet) {
		tweet.jDate = new Date(tweet.created_at);				        
		db.collection(conf.destinationCollection).insert(tweet,function(err) {
			if (err) {
					console.log(dateFormat(new Date(),"yyyymmdd h:MM:ss")+" Write Error: "+err);
				 } 
		});

	})
	stream.on('disconnect', function (disconnectMessage) {
	  console.log(disconnectMessage)
	})

	stream.on('connect', function (request) {
	  console.log("Connecting...")
	})
}
