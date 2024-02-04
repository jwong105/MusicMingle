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

app.get("/callback", async (req, res) => {
  try {
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
          Buffer.from(config.CLIENT_ID + ":" + config.CLIENT_SECRET).toString("base64"),
      },
      json: true,
    };

    // Request for access token
    let response = await new Promise((resolve, reject) => {
      request.post(authOptions, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          reject(error || body);
        } else {
          resolve(body);
        }
      });
    });

    let access_token = response.access_token;
    accessToken = access_token
    console.log("Access Token:", accessToken);
    
    // Request for user ID using the obtained access token
    let options = {
      url: "https://api.spotify.com/v1/me",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      json: true,
    };

    response = await new Promise((resolve, reject) => {
      request.get(options, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          reject(error || body);
        } else {
          resolve(body);
        }
      });
    });

    let userID = response.id;
    console.log("User ID:", userID);
    
    res.send("Success! Check console for the access token and user ID.");
  } catch (error) {
    res.send("Failed to retrieve access token or user ID. Check console for details.");
    console.error(error);
  }
});

app.post('api/setAccessToken', (req, res) => {
  console.log('Setting access token')
  accessToken = req.body.accessToken
  console.log(accessToken)
})


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