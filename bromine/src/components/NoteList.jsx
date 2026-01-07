import React, { useState, useEffect } from 'react';
import NoteItem from './NoteItem';

const NoteList = ({ notes, onNoteClick, onDelete }) => {
  const [contextMenu, setContextMenu] = useState(null); // Stores position {x, y} and noteId

  // Close context menu if user clicks anywhere else
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e, note) => {
    e.preventDefault(); // Prevent default browser right-click menu
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      noteId: note._id
    });
  };

  const handleDeleteOption = () => {
    if (contextMenu?.noteId) {
      onDelete(contextMenu.noteId);
      setContextMenu(null);
    }
  };

  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <p>No notes yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="note-grid">
      {notes.map((note) => (
        <NoteItem 
          key={note._id} 
          note={note} 
          onClick={onNoteClick} 
          onContextMenu={handleContextMenu} 
        />
      ))}

      {/* Render Custom Context Menu if active */}
      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={handleDeleteOption} className="context-menu-item delete">
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default NoteList;