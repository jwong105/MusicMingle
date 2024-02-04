const express = require("express");
const mongoose = require('mongoose');
const config = require('./config.env');

const app = express();
const port = config.PORT || 3001;

app.use(express.json());

app.use(require("./profile"));

const uri = config.URI;

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