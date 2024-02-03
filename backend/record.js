// Import required modules
const express = require("express");
const mongoose = require('mongoose');

// Create an instance of the express router
const recordRoutes = express.Router();

// Define the record schema
const recordSchema = new mongoose.Schema({
  name: String,
  position: String,
  level: String,
});

// Create the Record model based on the schema
const Record = mongoose.model("Record", recordSchema);

// Define routes

// Route to get all records
recordRoutes.route('/record').get(async function(req, res) {
  try {
    const result = await Record.find({});
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to get a single record by id
recordRoutes.route("/record/:id").get(async function (req, res) {
  try {
    const result = await Record.findById(req.params.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to create a new record
recordRoutes.route("/record/add").post(async function (req, res) {
  try {
    console.log(req.body)
    const newRecord = await Record.create({
      name: req.body.name,
      position: req.body.position,
      level: req.body.level,
    });

    res.json(newRecord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to update a record by id
recordRoutes.route("/update/:id").post(async function (req, res) {
  try {
    const result = await Record.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      position: req.body.position,
      level: req.body.level,
    });
    console.log("1 document updated");
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to delete a record by id
recordRoutes.route("/:id").delete(async (req, res) => {
  try {
    const result = await Record.findByIdAndDelete(req.params.id);
    console.log("1 document deleted");
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Export the recordRoutes
module.exports = recordRoutes;