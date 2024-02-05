const express = require("express");
const cors = require('cors');
const request = require('request');
const mongoose = require('mongoose');
const config = require('./config.env');
const axios = require('axios');
const { Profile, profileRoutes } = require('./profile');

const app = express();
const port = config.PORT || 3001;

app.use(express.json());
app.use(cors());

// Use the profile routes
app.use(profileRoutes);

const uri = config.URI;
var accessToken = "";
var userID;
var topArtists;
var favouriteArtists;

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
    "user-read-private user-follow-read user-read-email user-library-read user-top-read user-read-recently-played";
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
    let tokenResponse = await new Promise((resolve, reject) => {
      request.post(authOptions, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          reject(error || body);
        } else {
          resolve(body);
        }
      });
    });

    let access_token = tokenResponse.access_token;
    accessToken = access_token;
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

    userID = response.id;
    console.log("User ID:", userID);

    topArtists = await getTopArtists();
    console.log(topArtists);

    favouriteArtists = await getLikedArtists();
    console.log(favouriteArtists);

    const mergedArtists = [...new Set([...topArtists, ...favouriteArtists])];
    console.log(mergedArtists);

    // Update the user profile with mergedArtists
    const updatedProfile = await Profile.findOneAndUpdate(
      { spotifyUsername: userID },
      {
        $set: {}, // Set other fields if needed
        $addToSet: { topArtists: { $each: mergedArtists } },
      },
      { new: true, upsert: true }
    );

    console.log("Updated Profile:", updatedProfile);
    
    res.send("Success! Check console for the access token and user ID.");
  } catch (error) {
    res.send("Failed to retrieve access token or user ID. Check console for details.");
    console.error(error);
  }
});

async function getLikedArtists() {
  try {
    // Request for liked artists using the obtained access token
    let likedArtistsResponse = await axios.get("https://api.spotify.com/v1/me/following?type=artist&limit=50", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Check if 'artists.items' property exists in the response
    if (likedArtistsResponse.data.artists && likedArtistsResponse.data.artists.items && Array.isArray(likedArtistsResponse.data.artists.items)) {
      // Extract artist names from the response
      let likedArtistsNames = likedArtistsResponse.data.artists.items.map(artist => artist.name);

      return likedArtistsNames;
    } else {
      console.error('Error getting liked artists: Unexpected response format', likedArtistsResponse.data);
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    console.error('Error getting liked artists:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Retrieve top artists from last 6 months (time_range=medium_term)
async function getTopArtists() {
  try {
    // Request for top artists using the obtained access token
    let topArtistsResponse = await axios.get("https://api.spotify.com/v1/me/top/artists?limit=30", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Extract artist names from the response
    let topArtistsNames = topArtistsResponse.data.items.map(artist => artist.name);

    return topArtistsNames;
  } catch (error) {
    console.error('Error getting top artists:', error.response ? error.response.data : error.message);
    throw error;
  }
}

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