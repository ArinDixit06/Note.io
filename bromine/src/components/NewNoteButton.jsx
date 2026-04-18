import React from 'react';

const NewNoteButton = ({ onClick }) => {
  return (
    <button className="new-note-btn" onClick={onClick}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>New Page</span>
    </button>
  );
};

export default NewNoteButton;
