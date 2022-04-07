
const SpotifyWebApi = require('spotify-web-api-node');
const dotenv = require('dotenv');
dotenv.config({path: './.env'});

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI, // redirect uri
})

module.exports = spotifyApi;