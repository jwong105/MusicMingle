// Import required modules
const express = require("express");
const mongoose = require('mongoose');

// Create an instance of the express router
const profileRoutes = express.Router();

// Define the profile schema
const profileSchema = new mongoose.Schema({
  // Define the primary key to be Spotify Username
  spotifyUsername: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  discordUsername: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  topArtists: [String],
});

// Create the Profile model based on the schema
const Profile = mongoose.model("Profile", profileSchema);

// Define routes

// Route to get all profiles
profileRoutes.route('/profile').get(async function(req, res) {
  try {
    const result = await Profile.find({});
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to get a single profile by spotify id
profileRoutes.route("/profile/:spotifyUsername").get(async function (req, res) {
  try {
    const result = await Profile.findOne({ spotifyUsername: req.params.spotifyUsername });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to create a new profile
profileRoutes.route("/profile/add").post(async function (req, res) {
  try {
    console.log(req.body)
    const newRecord = await Profile.create({
      spotifyUsername: req.body.spotifyUsername,
      name: req.body.name,
      discordUsername: req.body.discordUsername,
      city: req.body.city,
      country: req.body.country,
      topArtists: req.body.topArtists,
    });

    res.json(newRecord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to update a profile by spotify id
profileRoutes.route("/update/:spotifyUsername").post(async function (req, res) {
  try {
    const result = await Profile.findOneAndUpdate(
      { spotifyUsername: req.params.spotifyUsername },
      {
        $set: {
          name: req.body.name,
          discordUsername: req.body.discordUsername,
          city: req.body.city,
          country: req.body.country,
          topArtists: req.body.topArtists,
        },
      },
      { new: true } // Return the updated document
    );

    if (!result) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log("1 document updated");
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to delete a profile by spotify id
profileRoutes.route("/:spotifyUsername").delete(async (req, res) => {
  try {
    const result = await Profile.findOneAndDelete({ spotifyUsername: req.params.spotifyUsername });
    console.log("1 document deleted");
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Export the profileRoutes
module.exports = profileRoutes;