const dotenv = require('dotenv');
dotenv.config();




const authEndpoint = "https://accounts.spotify.com/authorize";
const redirectUri = process.env.REDIRECT_URI;
const clientId = process.env.CLIENT_ID;

const scopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "playlist-modify-private",
  "playlist-modify-public",
  "playlist-read-collaborative",
  "playlist-read-private",
  "user-modify-playback-state",
  "app-remote-control",
];

const loginUrl = `${authEndpoint}?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes.join(
  "%20"
)}`;
module.exports = loginUrl;

