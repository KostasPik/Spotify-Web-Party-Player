const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const creds = require('./spotify');
const spotifyApi = require('./config/spotify');
const morgan = require('morgan');
const compression = require('compression');






const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: {origin: "*"}});

const shouldCompress = (req, res) => {
  if (req.headers['x-no-compression']) {
    return false
  }
  return compression.filter(req, res);
}


app.use(compression({
  filter: shouldCompress,
  level: 6,
}));





dotenv.config();
app.use(bodyParser.urlencoded({extended:1}));
app.use(bodyParser.json({}));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.set("views", "views");


const myIp = process.env.MY_IP // local ip of the server so that other devices can access the server
const PORT = 3000


server.listen(PORT, () => {
  console.log(`Server listening to port ${PORT}.`)
})



app.use('/api', require('./routes/api'));


app.get('', async (req, res) => {
  res.render('index', {myIp: myIp});
})



app.get('/secret', async (req, res) => { // secret console that lets host control music without limitations
  res.render('secretController', {myIp: myIp});
})


app.get('/add-song', async (req, res) => { // route that lets you add a song to the playlist
  res.render('addSong', {myIp: myIp});
})


app.get('/authenticate', async(req, res) => { // backend authentication route
      res.render('authenticate', {loginUrl: creds}); // you need to authenticate with the server before you let others use the app
})


app.post('/login', async (req,res) => {   
    //  Get the "code" value posted from the client-side and get the user's accessToken from the spotify api     
      const code = req.body.code
      // Retrieve an access token
      spotifyApi.authorizationCodeGrant(code).then((data) => {
          spotifyApi.setAccessToken(data.body['access_token']);
          spotifyApi.setRefreshToken(data.body['refresh_token']);
          // Returning the User's AccessToken in the json format
          // console.log(data);
          res.json({
              accessToken : data.body.access_token,
          })
      })
      .catch((err) => {
          console.log(err);
          res.sendStatus(400)
      })
})




var songTitle = ""; // title of the current song. We use this variable to know when the song has changed.
const PLAYLIST_ID =  process.env.PLAYLIST_ID // party playlist id
var VOTES_TO_SKIP = 3; // votes needed to skip song
var VOTES = 0; // current votes number


var ipMap = new Map(); //map containing ip values of people who have voted to change a song. We need to keep track on them so as to make sure they vote just once per song.


io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);


  setInterval(sendData, 1*1500/1); //send playback state every 1.5 seconds
  setInterval(sendVotes, 1*1000/4); // send votes status every 1/4 seconds

    socket.on('vote-to-skip-secret', () => { //this is the secret route that only the host has access through the secret route
      if (VOTES+1 == VOTES_TO_SKIP) {
        spotifyApi.skipToNext()
            .then(function() {
              VOTES = 0;
              console.log('Skip to next');
            }, function(err) {
                //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
                console.log('Something went wrong!', err);
            });
        } else {
            VOTES++;
        }
    })

    socket.on('vote-to-skip', () => {
    let ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress.split(":")[3];
    console.log(ip);
    if (VOTES+1 == VOTES_TO_SKIP  && !ipMap.get(ip)) {
      
      spotifyApi.skipToNext()
          .then(function() {
            VOTES = 0;
            console.log('Skip to next');
          }, function(err) {
              //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
              console.log('Something went wrong!', err);
          });
      } else {
        if(!ipMap.get(ip)){ //if user hasn't voted yet 
          VOTES++;
          ipMap.set(ip, 1); // set map ip value to true because user has now voted
        }
      }

    });

  function sendVotes() {
    let ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress.split(":")[3]; // get the ip
    let hasVoted = false; 
    // if (ipArray.includes(ip)) hasVoted = true;
    if(ipMap.get(ip)) hasVoted = true; //if user has voted set hasVoted to true
    socket.emit("votes", {
      votes: VOTES,
      hasVoted: hasVoted //if person has voted
    })
  }



  function sendData() {
    spotifyApi.getMyCurrentPlaybackState()
        .then(function(data) {
            // Output items
            if (data.body) {
                // console.log("User is currently playing something!");
                if (data.body.device && data.body.device.available_markets)
                delete data.body.device.available_markets; // delete useless large nested js object
                if (data.body.item && data.body.item.name && data.body.item.name != songTitle) { // if song changes and we have votes, make them 0
                    songTitle = data.body.item.name;
                    VOTES = 0; // set VOTES to 0 because song has changed
                  
                    ipMap.forEach(function(value, key) { // remove all votes because song has changed
                      ipMap.set(key,0);
                    })
                }
                socket.emit('currentPlaybackState', {data: data.body})
            } else {
            console.log("User is not playing anything, or doing so in private.");
            }
        }, function(err) {
            console.log('Something went wrong!', err);
        });
  }

})