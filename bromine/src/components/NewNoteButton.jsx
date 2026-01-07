import React from 'react';

const NewNoteButton = ({ onClick }) => {
  return (
    <button className="new-note-btn" onClick={onClick}>
      + New
    </button>
  );
};

export default NewNoteButton;