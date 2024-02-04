const express = require("express");
const cors = require('cors');
const request = require('request');
const mongoose = require('mongoose');
const config = require('./config.env');

const app = express();
const port = config.PORT || 3001;

app.use(express.json());
app.use(cors());

app.use(require("./profile"));

const uri = config.URI;
var accessToken = "";
var userID;

// APIS
app.get("/", (req, res) => {
  res.send('<a href="/api/login">Login with Spotify</a>');
});

var corsOption = {
  origin: "http://localhost:3001",
  optionsSuccessStatus: 200,
};

app.get("/api/login", cors(corsOption), (request, response) => {
  
  let scope =
    "user-read-private user-read-email user-library-read user-top-read user-read-recently-played playlist-modify-public playlist-modify-private";
  response.redirect(
    "https://accounts.spotify.com/authorize" +
      "?response_type=code" +
      "&client_id=" +
      config.CLIENT_ID +
      "&scope=" +
      encodeURIComponent(scope) +
      "&redirect_uri=" +
      encodeURIComponent(config.REDIRECT_URI)
  );
});

app.get("/callback", (req, res) => {
  let code = req.query.code || null;
  let authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: config.REDIRECT_URI,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization:
        "Basic " +
        new Buffer(config.CLIENT_ID + ":" + config.CLIENT_SECRET).toString("base64"),
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      let access_token = body.access_token;
      console.log("Access Token:", access_token);
      accessToken = access_token
      res.send("Success! Check console for the access token.");
    } else {
      res.send("Failed to retrieve access token. Check console for details.");
      console.error(body);
    }
  });

  //get userId
var options = {
  url: "https://api.spotify.com/v1/me",
  headers: {
    Authorization:
      `Bearer ${accessToken}`
  },
  json: true,
};

request.get(options, function (error, response, body) {
  userID = body.id;
  console.log(userID)
});

});

// Connect to MongoDB using the Atlas URI
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Create reference to database connection
const db = mongoose.connection;

// Connect the database
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Successfully connected to MongoDB.');

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
  });
});