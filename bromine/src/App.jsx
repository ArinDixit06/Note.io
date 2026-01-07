import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import NewNoteButton from './components/NewNoteButton';
import { fetchNotes, createNote, updateNote, deleteNote } from './api';
import './App.css';

function App() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  
  // --- NEW STATE FOR SIDEBAR ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await fetchNotes();
      // Ensure we always have an array
      setNotes(Array.isArray(data) ? data.reverse() : []);
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CREATE FUNCTION ---
  const handleCreate = async () => {
    try {
      // 1. Create a default object
      const defaultNote = { 
        title: "Untitled", 
        content: "<p></p>" // Empty paragraph for the editor
      };
      
      // 2. Save to Server first
      const createdNote = await createNote(defaultNote);

      // 3. Update the Grid (Home Page) immediately
      setNotes((prevNotes) => [createdNote, ...prevNotes]);

      // 4. Open the Editor immediately
      setSelectedNote(createdNote);
      
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Could not create note. Is the server running?");
    }
  };

  const handleUpdate = async (updatedNote) => {
    // Optimistic UI Update (Updates grid while you type)
    setNotes((prevNotes) => 
      prevNotes.map((n) => (n._id === updatedNote._id ? updatedNote : n))
    );
    // Send to server
    await updateNote(updatedNote._id, updatedNote);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteNote(id);
        // Remove from local state immediately
        setNotes((prevNotes) => prevNotes.filter((n) => n._id !== id));
        // If we were editing this note, go back to dashboard
        if (selectedNote?._id === id) {
          setSelectedNote(null);
        }
      } catch (error) {
        console.error("Error deleting note:", error);
      }
    }
  };

  return (
    <div className="app-layout">
      {/* --- SIDEBAR WITH TOGGLE PROPS --- */}
      <Sidebar 
        onHome={() => setSelectedNote(null)} 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      <main className="main-content">
        {selectedNote ? (
          /* --- EDITOR VIEW --- */
          <NoteEditor 
            note={selectedNote} 
            onUpdate={handleUpdate} 
            onDelete={handleDelete}
            onBack={() => setSelectedNote(null)} 
          />
        ) : (
          /* --- GRID / DASHBOARD VIEW --- */
          <div className="dashboard">
            <div className="dashboard-header">
              <h1>My Workspace</h1>
              <NewNoteButton onClick={handleCreate} />
            </div>
            
            {isLoading ? (
              <p style={{textAlign: 'center', color: '#888'}}>Loading your notes...</p>
            ) : (
              <NoteList 
                notes={notes} 
                onNoteClick={setSelectedNote} 
                onDelete={handleDelete}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;