const express = require('express');
const router = express.Router();
const dotenv = require('dotenv')
const spotifyApi = require('../config/spotify');
const apicache = require('apicache');


let cache = apicache.middleware;

dotenv.config({path: './.env'});



var songUris = []; // song uris to check if a song is in the playlist

setInterval( () =>
  spotifyApi.getPlaylistTracks(process.env.PLAYLIST_ID).
    then(data => {
    songUris = [];
     data.body.items.forEach((item) => {
       songUris.push(item.track.uri);
     })
    })
    .catch((err) => console.log(err)), 
    10000 //update every 10 seconds songUris array
)



const PLAYLIST_ID =  process.env.PLAYLIST_ID;



router.get('', async(req, res) => {
    spotifyApi.getPlaylist(PLAYLIST_ID).then(
        function(data) {
          console.log('Playlist: ', data.body);
          res.json({data:data.body})
        },
        function(err) {
          console.error(err);
        }
      );
})

router.get('/add-song-to-playlist', async (req, res) => {    
    const spotify_link = req.query.spotify_link;
    const track_id = spotify_link.split("/")[4].split("?")[0]
    if(track_id.length != 22) res.json({text: "Invalid spotify url"})
    else if (songUris.includes(`spotify:track:${track_id}`)) res.json({text: "Song is already in the playlist."}) //if song is already in the playlist don't add it
    else { //if song is not in the playlist...
    spotifyApi.addTracksToPlaylist(PLAYLIST_ID, [`spotify:track:${track_id}`])
    .then(function(data) {
      console.log('Added tracks to playlist!');
      res.json({text: "Added song to queue!"})
    }, function(err) {
      console.log('Something went wrong!', err);
      res.json({text: "Something went wrong :(.Please try again."})
    });
    }
})

router.get('/next-songs', async(req, res) => {
    spotifyApi.getPlaylist(PLAYLIST_ID)
  .then(function(data) {
    var playlistJson = data.body.tracks.items;  //get whole playlist
        spotifyApi.getMyCurrentPlaybackState()
            .then(function(data) {
                // Output items
                if (data.body) { //make playlist
                    const currentSongUri = data.body.item.uri;

                    var index = 0;
                    for(var i = 0; i < playlistJson.length; ++i) {
                        if (playlistJson[i].track.uri != currentSongUri) {
                            index++;
                        } else {
                           break; 
                        }
                    }
                    var array = [];
                    for(var i = index + 1; i < playlistJson.length; ++i) { //get next objects till the end of playlist
                        if( playlistJson[i] && playlistJson[i].track &&playlistJson[i].track.available_markets)
                        delete playlistJson[i].track.available_markets; //delete large nested useless dictionary
                        if( playlistJson[i] && playlistJson[i].track&& playlistJson[i].track.album &&playlistJson[i].track.album.available_markets)
                        delete playlistJson[i].track.album.available_markets; //delete large nested useless dictionary
                        array.push(playlistJson[i].track);
                    }
                    for(var i = 0; i < index; ++i) { //get previous objects because the playlist is in a loop
                        if( playlistJson[i] && playlistJson[i].track &&playlistJson[i].track.available_markets)
                        delete playlistJson[i].track.available_markets; //delete large nested useless dictionary
                        if( playlistJson[i] && playlistJson[i].track&& playlistJson[i].track.album &&playlistJson[i].track.album.available_markets)
                        delete playlistJson[i].track.album.available_markets; //delete large nested useless dictionary
                        array.push(playlistJson[i].track);
                    }
                    res.render("nextSongs", {spotifyJson: array})
                } else {
                console.log("User is not playing anything, or doing so in private.");
                }
            }, function(err) {
                console.log('Something went wrong!', err);
        });
  }, function(err) {
    console.log('Something went wrong!', err);
  });
})




router.get('/volume', async(req, res) => {
    const volume_percent = parseInt(req.query.volume_percent);
    spotifyApi.setVolume(volume_percent).then((data) => {
        res.json({message: "Success"})
    }).catch(err => {
        console.log(err);
        res.json({err:err});
    })
})

router.get('/pause', async(req, res) => {
    spotifyApi.pause();
})
router.get('/play', async(req, res) => {
    spotifyApi.play();
})
module.exports = router;
