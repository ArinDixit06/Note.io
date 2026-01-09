const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  // --- ADD THIS (The unique ID from Flutter) ---
  localId: {
    type: String,
    required: true,
    unique: true 
  },
  // ---------------------------------------------
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: false
  },
  coverImage: {
    type: String, 
    default: "" 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Note', NoteSchema);
