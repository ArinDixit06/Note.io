// In your backend (e.g., models/Note.js)
const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: false
  },
  // --- ADD THIS FIELD ---
  coverImage: {
    type: String, 
    default: "" 
  },
  // ---------------------
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Note', NoteSchema);