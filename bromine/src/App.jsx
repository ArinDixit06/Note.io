import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import NewNoteButton from './components/NewNoteButton';
import { fetchNotes, createNote, updateNote, deleteNote } from './api';
import { v4 as uuidv4 } from 'uuid'; // <--- IMPORT THIS
import './App.css';

function App() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await fetchNotes();
      setNotes(Array.isArray(data) ? data.reverse() : []);
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // 1. Generate a UUID (Required by your Server now)
      const newLocalId = uuidv4(); 

      const defaultNote = { 
        localId: newLocalId, // <--- CRITICAL FIX: Send localId
        title: "Untitled", 
        content: "<p></p>",
        coverImage: ""
      };
      
      const createdNote = await createNote(defaultNote);

      setNotes((prevNotes) => [createdNote, ...prevNotes]);
      setSelectedNote(createdNote);
      
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Could not create note. Is the server running?");
    }
  };

  const handleUpdate = async (updatedNote) => {
    // Optimistic UI Update
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
        setNotes((prevNotes) => prevNotes.filter((n) => n._id !== id));
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
      <Sidebar 
        onHome={() => setSelectedNote(null)} 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      <main className="main-content">
        {selectedNote ? (
          <NoteEditor 
            note={selectedNote} 
            onUpdate={handleUpdate} 
            onDelete={handleDelete}
            onBack={() => setSelectedNote(null)} 
            allNotes={notes} 
            onNavigate={setSelectedNote}
          />
        ) : (
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
