import React from 'react';

const NewNoteButton = ({ onClick }) => {
  return (
    <button className="new-note-btn" onClick={onClick}>
      <span>＋</span>
      <span>New Page</span>
    </button>
  );
};

export default NewNoteButton;
