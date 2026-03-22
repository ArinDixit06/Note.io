const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const Note = require('./models/Note');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.log(err));

// --- API Routes ---

app.get('/api/notes', async (req, res) => {
  const notes = await Note.find();
  res.json(notes);
});

// --- UPDATED POST ROUTE (The Fix) ---
app.post('/api/notes', async (req, res) => {
  const { localId, title, content, coverImage } = req.body;

  try {
    // findOneAndUpdate with 'upsert: true' does exactly what you want:
    // It searches for a note with this 'localId'.
    // If it exists -> Updates it.
    // If it doesn't -> Creates a new one.
    const note = await Note.findOneAndUpdate(
      { localId: localId }, 
      { title, content, coverImage, localId }, 
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// -------------------------------------

app.put('/api/notes/:id', async (req, res) => {
  const updatedNote = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedNote);
});

app.delete('/api/notes/:id', async (req, res) => {
  await Note.findByIdAndDelete(req.params.id);
  res.json({ message: "Note Deleted" });
});

app.listen(5000, () => console.log("Server running on port 5000"));
