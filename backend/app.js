const express = require("express");
const cors = require('cors');
const request = require('request');
const mongoose = require('mongoose');
const axios = require('axios');
const { Profile, profileRoutes } = require('./profile');
require('dotenv').config();
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

// Use the profile routes
app.use(profileRoutes);

const uri = process.env.URI;
var accessToken = "";

// set up client key
const openai = new OpenAI({apiKey: process.env.APIKEY});

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
      process.env.CLIENT_ID +
      "&scope=" +
      encodeURIComponent(scope) +
      "&redirect_uri=" +
      encodeURIComponent(process.env.REDIRECT_URI)
  );
});

app.get("/callback", async (req, res) => {
  try {
    let code = req.query.code || null;
    let authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET).toString("base64"),
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

    const userID = response.id;
    console.log("User ID:", userID);

    const userEmail = response.email;
    console.log(userEmail);

    const topArtists = await getTopArtists();
    // console.log(topArtists);

    const favouriteArtists = await getLikedArtists();
    // console.log(favouriteArtists);

    const topGenres = await getTopGenres();
    // console.log(topGenres);

    const mergedArtists = [...new Set([...topArtists, ...favouriteArtists])];
    // console.log(mergedArtists);

    const userDescription = await getProfileDescription(topGenres, mergedArtists);
    // console.log(description);

    console.log(await Profile.findOne({ email: userEmail }));

    // Update the user profile with mergedArtists
    const updatedProfile = await Profile.findOneAndUpdate(
      { email: userEmail },
      {
        $set: {
          spotifyUsername: userID,
          description: userDescription,
        },
        $addToSet: {
          topArtists: { $each: mergedArtists },
          topGenres: { $each: topGenres },
        },
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

// Retrieve top genres from last 6 months (time_range=medium_term)
async function getTopGenres() {
  try {
    // Request for top artists using the obtained access token
    let topResponse = await axios.get("https://api.spotify.com/v1/me/top/artists", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Extract artist names from the response
    let topGenres = topResponse.data.items.map(artist => artist.genres);

    // Flatten the array of arrays into a single array
    const flattenedArray = topGenres.flat();

    // Create a Set to eliminate duplicates and then convert it back to an array
    const genresArray = [...new Set(flattenedArray)];

    return genresArray;
  } catch (error) {
    console.error('Error getting top artists:', error.response ? error.response.data : error.message);
    throw error;
  }
}

app.post("/findConcerts", async (req, res) => {
  try {
    console.log(req.body);
    const userArtist = req.body.artist;
    const userLocation = req.body.city;

    // Ticketmaster API key
    const apiKey = process.env.TICKETMASTER_API_KEY;

    // Make a request to the Ticketmaster API
    const response = await axios.get(`https://app.ticketmaster.com/discovery/v2/events`, {
      params: {
        apikey: apiKey,
        keyword: userArtist,
        city: userLocation,
        classificationName: 'music', // Specify the type of events you are interested in
      },
    });

    // Handle the response and extract relevant information
    const concerts = response.data._embedded.events.map(event => {
      const venues = event._embedded.venues || [];
      const firstVenue = venues[0] || {};
    
      return {
        name: event.name,
        date: event.dates.start.localDate,
        venue: firstVenue.name || 'Venue information not available',
        location: firstVenue.city ? firstVenue.city.name : 'Location information not available',
      };
    });

    console.log(concerts)

    // Fetch user profiles based on the specified artist and city
    const userProfiles = await Profile.find({
      topArtists: userArtist,
      city: userLocation,
    });

    // Include user profiles in the response
    res.json({ concerts, userProfiles });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to find any upcoming concerts in this area.");
  }
});

// Create a brief description for the user based off their top artists and genres
async function getProfileDescription(genreArray, artistArray) {
  try {
    const user_message = `Given the top music genres a user listens to ${genreArray}, and a list of some of their most listened to and liked musical artists ${artistArray}, can you write a short, friendly, 1 paragraph, introduction description about this user's music interests from a first person perspective for others to read and relate to. You do not need to say the user's name.`;
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: user_message },
      ],
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.log("Failed to create a description.");
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