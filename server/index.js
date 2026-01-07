const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const Note = require('./models/Note');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB (Replace with your own Connection String)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.log(err));

// --- API Routes ---

// Get all notes
app.get('/api/notes', async (req, res) => {
  const notes = await Note.find();
  res.json(notes);
});

// Create a new note
app.post('/api/notes', async (req, res) => {
  const newNote = new Note(req.body);
  await newNote.save();
  res.json(newNote);
});

// Update a note
app.put('/api/notes/:id', async (req, res) => {
  const updatedNote = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedNote);
});

// Delete a note
app.delete('/api/notes/:id', async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  res.json({ message: "Note Deleted" });
});

app.listen(5000, () => console.log("Server running on port 5000"));