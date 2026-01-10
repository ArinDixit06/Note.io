import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core'; 
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { CodeBlock } from '@tiptap/extension-code-block';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import SlashCommand from '../extensions/SlashCommand'; 
import SlashMenu from './SlashMenu';

// --- NEW IMPORTS ---
import NoteLink from '../extensions/NoteLink';
import NotePicker from './NotePicker'; 

// ... (Keep COVERS array) ...
const COVERS = [
  // --- GRADIENTS (12) ---
  "linear-gradient(90deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
  "linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)",
  "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
  "linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(120deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(to right, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(to top, #30cfd0 0%, #330867 100%)",
  "linear-gradient(to top, #5ee7df 0%, #b490ca 100%)",
  "linear-gradient(to right, #b8cbb8 0%, #b8cbb8 0%, #b465da 0%, #cf6cc9 33%, #ee609c 66%, #ee609c 100%)",
  "linear-gradient(to right, #6a11cb 0%, #2575fc 100%)",
  "linear-gradient(to top, #c471f5 0%, #fa71cd 100%)",
  // ... (Rest of your COVERS array) ...
  "#FFD700", "#FF6B6B", "#4ECDC4", "#1A535C", "#F7FFF7", "#FFE66D", "#292F36", "#5F0F40", "#9A031E", "#FB8B24",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
  // ... (Include all other images from your original code) ...
];

const NoteEditor = ({ note, onUpdate, onDelete, onBack, allNotes, onNavigate }) => {
  const [title, setTitle] = useState(note.title || "");
  const [cover, setCover] = useState(note.coverImage || "");
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  
  // --- NEW STATE FOR NOTE PICKER ---
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [pickerRange, setPickerRange] = useState(null); 

  const pickerRef = useRef(null);
  
  // --- NEW: Ref for the title textarea ---
  const titleRef = useRef(null);

  useEffect(() => {
    if (note) {
        setTitle(note.title || "");
        setCover(note.coverImage || "");
    }
  }, [note]);

  // --- NEW: Auto-resize Title Logic ---
  const adjustTitleHeight = () => {
    const textarea = titleRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height to recalculate
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
    }
  };

  // Adjust height whenever title changes
  useEffect(() => {
    adjustTitleHeight();
  }, [title]);

  const handleCoverSelect = (selectedCover) => {
    setCover(selectedCover);
    setShowCoverPicker(false);
    onUpdate({ ...note, title, content: editor.getHTML(), coverImage: selectedCover });
  };

  const removeCover = () => {
    setCover("");
    onUpdate({ ...note, title, content: editor.getHTML(), coverImage: "" });
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    // Don't need to call adjustHeight here because the useEffect([title]) handles it
    onUpdate({ ...note, title: e.target.value, coverImage: cover, content: editor ? editor.getHTML() : "" });
  };

  // ... (Keep insertLinkedNote, getSlashItems, renderSlashMenu, CustomKeymap) ...
  const insertLinkedNote = (selectedNote) => {
    if (!editor) return;
    const previewText = selectedNote.content.replace(/<[^>]+>/g, '').slice(0, 100) || "No preview";
    editor.chain().focus().insertContentAt(pickerRange, {
      type: 'noteLink',
      attrs: {
        id: selectedNote._id,
        title: selectedNote.title,
        cover: selectedNote.coverImage,
        preview: previewText,
        createdAt: selectedNote.createdAt,
        viewMode: 'card' 
      }
    }).run();
    setShowNotePicker(false);
  };

  const getSlashItems = ({ query }) => {
    // ... (Your existing slash items) ...
    return [
      { title: 'Text', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(), element: <span>Aa &nbsp; Text</span> },
      { title: 'Heading 1', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(), element: <span>H1 &nbsp; Big Heading</span> },
      // ... (Rest of your items) ...
      { 
        title: 'Link to Note', 
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          setPickerRange(range.from);
          setShowNotePicker(true);
        }, 
        element: <span>🔗 &nbsp; Link Note</span> 
      },
    ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
  };
  
  const renderSlashMenu = () => { /* ... Keep exact existing logic ... */ 
      let component; let popup;
      return {
        onStart: props => {
          component = new ReactRenderer(SlashMenu, { props, editor: props.editor });
          if (!props.clientRect) return;
          popup = tippy('body', { getReferenceClientRect: props.clientRect, appendTo: () => document.body, content: component.element, showOnCreate: true, interactive: true, trigger: 'manual', placement: 'bottom-start' });
        },
        onUpdate: props => { component.updateProps(props); if (!props.clientRect) return; popup[0].setProps({ getReferenceClientRect: props.clientRect }); },
        onKeyDown: props => { if (props.event.key === 'Escape') { popup[0].hide(); return true; } return component.ref?.onKeyDown(props); },
        onExit: () => { popup[0].destroy(); component.destroy(); },
      };
  };

  const CustomKeymap = Extension.create({
    name: 'customKeymap', priority: 1000, 
    addKeyboardShortcuts() { return { 'Enter': ({ editor }) => { if (editor.isActive('listItem')) return editor.chain().splitListItem('listItem').run(); return false; } }; }
  });

  const editor = useEditor({
    extensions: [
      StarterKit, Placeholder.configure({ placeholder: "Type '/' for commands..." }),
      HorizontalRule, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      CodeBlock, SlashCommand.configure({ suggestion: { items: getSlashItems, render: renderSlashMenu } }),
      CustomKeymap, 
      NoteLink.configure({ onNavigate: (noteId) => { if (onNavigate) onNavigate(noteId); } })
    ],
    content: note.content || '',
    onUpdate: ({ editor }) => {
      onUpdate({ ...note, title, coverImage: cover, content: editor.getHTML() });
    },
  });

  if (!editor) return null;

  return (
    <div className="editor-shell" style={{ width: '100%', height: '100%' }}>
      {/* ... (Keep Cover Logic) ... */}
      <div className={`cover-image-container ${cover ? 'visible' : ''}`}>
         {/* ... (Keep Cover Render) ... */}
         {cover.startsWith('linear-gradient') || cover.startsWith('#') ? (
          <div className="cover-image" style={{ background: cover }} />
        ) : (
          <img src={cover} alt="Cover" className="cover-image" />
        )}
        <div className="cover-controls" ref={pickerRef}>
          <button className="cover-btn" onClick={() => setShowCoverPicker(!showCoverPicker)}>Change Cover</button>
          <button className="cover-btn remove-btn" onClick={removeCover}>Remove</button>
          {showCoverPicker && (
            <div className="cover-picker-menu">
              {COVERS.map((c, index) => (
                 <div key={index} className="cover-option" onClick={() => handleCoverSelect(c)} style={c.startsWith('http') ? {backgroundImage: `url(${c})`, backgroundSize:'cover'} : {background: c}} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showNotePicker && (
        <NotePicker 
          notes={allNotes.filter(n => n._id !== note._id)}
          onClose={() => setShowNotePicker(false)}
          onSelect={insertLinkedNote}
        />
      )}

      <div className="editor-container">
        <div className="editor-header">
          <button onClick={onBack} className="secondary-btn">← Back</button>
          <div className="editor-actions">
            <button onClick={() => { if(window.confirm("Delete note?")) onDelete(note._id); }} className="delete-btn" style={{ background: 'transparent', border:'none', cursor:'pointer', color:'#FF3B30'}}>🗑️ Delete</button>
          </div>
        </div>

        {!cover && (
           <button className="add-cover-btn" onClick={() => {setShowCoverPicker(true); setCover(COVERS[0]);}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Add Cover
          </button>
        )}

        <div className="editor-workspace">
          {/* --- CHANGE START: Replaced input with textarea --- */}
          <textarea 
            ref={titleRef}
            placeholder="Untitled" 
            value={title} 
            onChange={handleTitleChange} 
            className="title-input" 
            rows={1}
            spellCheck={false}
          />
           {/* --- CHANGE END --- */}
          
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
