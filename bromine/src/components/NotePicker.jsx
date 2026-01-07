import React from 'react';
import './NotePicker.css'; // Simple styles below

const NotePicker = ({ notes, onClose, onSelect }) => {
  return (
    <div className="note-picker-overlay" onClick={onClose}>
      <div className="note-picker-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Link a Note</h3>
        <div className="note-picker-list">
          {notes.map((note) => (
            <div 
              key={note._id} 
              className="note-picker-item" 
              onClick={() => onSelect(note)}
            >
              <span className="picker-icon">📄</span>
              <span className="picker-title">{note.title || "Untitled"}</span>
              <span className="picker-date">
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
          {notes.length === 0 && <p className="empty-msg">No other notes found.</p>}
        </div>
      </div>
    </div>
  );
};

export default NotePicker;