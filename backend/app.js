const express = require("express");
const mongoose = require('mongoose');
const config = require('./config.env'); // adjust the path based on your file structure

const app = express();
const port = config.PORT || 3001;

app.use(express.json());  // Move this line here

app.use(require("./record"));

const uri = config.URI;

console.log('Connection string:', uri);

// Connect to MongoDB using the Atlas URI
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Successfully connected to MongoDB.');

  // Use the recordRoutes in your application
  // app.use('/api', recordRoutes);

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
  });
});