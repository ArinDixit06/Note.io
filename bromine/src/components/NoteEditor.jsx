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

  // --- SOLID & MINIMAL (10) ---
  "#FFD700", // Gold
  "#FF6B6B", // Coral Red
  "#4ECDC4", // Teal
  "#1A535C", // Dark Cyan
  "#F7FFF7", // Mint White
  "#FFE66D", // Pastel Yellow
  "#292F36", // Gunmetal
  "#5F0F40", // Tyrian Purple
  "#9A031E", // Ruby Red
  "#FB8B24", // Dark Orange

  // --- NATURE & LANDSCAPES (10) ---
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80", // Mountains
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80", // Foggy Forest
  "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=1200&q=80", // Dark Mountain
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80", // Space/Earth
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80", // Alpine Lake
  "https://images.unsplash.com/photo-1511300636408-a63a6ad120de?auto=format&fit=crop&w=1200&q=80", // Winter Snow
  "https://images.unsplash.com/photo-1469474932222-8d80f3d628e9?auto=format&fit=crop&w=1200&q=80", // Hiker/Hills
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80", // Lake & Boat
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80", // Sunlight Forest
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1200&q=80", // Forest Path

  // --- ABSTRACT & PATTERNS (10) ---
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80", // Liquid Purple
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80", // Painted Gradient
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1200&q=80", // Geometric Lines
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80", // Abstract Paint
  "https://images.unsplash.com/photo-1502014822147-1aed80671e0a?auto=format&fit=crop&w=1200&q=80", // Minimal Plant Shadow
  "https://images.unsplash.com/photo-1464618663641-bbdd760ae84a?auto=format&fit=crop&w=1200&q=80", // Abstract Wave
  "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=80", // Gold Texture
  "https://images.unsplash.com/photo-1516541196185-394c23152581?auto=format&fit=crop&w=1200&q=80", // Oil Slick
  "https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=1200&q=80", // Abstract Shapes
  "https://images.unsplash.com/photo-1534237710431-e2fc698436d0?auto=format&fit=crop&w=1200&q=80", // Building Detail

  // --- ARCHITECTURE & INTERIORS (8) ---
  "https://images.unsplash.com/photo-1481026469463-66327c86e544?auto=format&fit=crop&w=1200&q=80", // Dark Room
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", // Modern Office
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80", // Office Desk
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80", // Minimal Interior
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80", // Skyscrapers
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1200&q=80", // Dark Ocean
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80", // Water Reflection
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80", // Grass Field
];

// Add `allNotes` and `onNavigate` props
const NoteEditor = ({ note, onUpdate, onDelete, onBack, allNotes, onNavigate }) => {
  const [title, setTitle] = useState(note.title || "");
  const [cover, setCover] = useState(note.coverImage || "");
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  
  // --- NEW STATE FOR NOTE PICKER ---
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [pickerRange, setPickerRange] = useState(null); // To know where to insert

  const pickerRef = useRef(null);

  useEffect(() => {
    if (note) {
        setTitle(note.title || "");
        setCover(note.coverImage || "");
    }
  }, [note]);

  // ... (Keep click outside useEffect) ...

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
    onUpdate({ ...note, title: e.target.value, coverImage: cover, content: editor ? editor.getHTML() : "" });
  };

  // --- NEW: Handle Note Selection from Picker ---
  const insertLinkedNote = (selectedNote) => {
    if (!editor) return;
    
    // Prepare preview text
    const previewText = selectedNote.content.replace(/<[^>]+>/g, '').slice(0, 100) || "No preview";

    // Insert the custom node
    editor.chain().focus().insertContentAt(pickerRange, {
      type: 'noteLink',
      attrs: {
        id: selectedNote._id,
        title: selectedNote.title,
        cover: selectedNote.coverImage,
        preview: previewText,
        createdAt: selectedNote.createdAt,
        viewMode: 'card' // Default to card view
      }
    }).run();

    setShowNotePicker(false);
  };

  // --- TIPTAP CONFIG ---
  const getSlashItems = ({ query }) => {
    return [
      { title: 'Text', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(), element: <span>Aa &nbsp; Text</span> },
      { title: 'Heading 1', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(), element: <span>H1 &nbsp; Big Heading</span> },
      { title: 'Heading 2', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(), element: <span>H2 &nbsp; Medium Heading</span> },
      { title: 'Bullet List', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(), element: <span>• &nbsp; Bullet List</span> },
      { title: 'Numbered List', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(), element: <span>1. &nbsp; Numbered List</span> },
      { title: 'Divider', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(), element: <span>— &nbsp; Divider</span> },
      { title: 'Code Block', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setCodeBlock().run(), element: <span>&lt;&gt; &nbsp; Code Block</span> },
      // --- NEW COMMAND ---
      { 
        title: 'Link to Note', 
        command: ({ editor, range }) => {
          // Delete the slash command text
          editor.chain().focus().deleteRange(range).run();
          // Open the picker
          setPickerRange(range.from);
          setShowNotePicker(true);
        }, 
        element: <span>🔗 &nbsp; Link Note</span> 
      },
    ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
  };

  const renderSlashMenu = () => { /* ... Keep Existing ... */
    let component;
    let popup;
    return {
      onStart: props => {
        component = new ReactRenderer(SlashMenu, { props, editor: props.editor });
        if (!props.clientRect) return;
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },
      onUpdate: props => {
        component.updateProps(props);
        if (!props.clientRect) return;
        popup[0].setProps({ getReferenceClientRect: props.clientRect });
      },
      onKeyDown: props => {
        if (props.event.key === 'Escape') { popup[0].hide(); return true; }
        return component.ref?.onKeyDown(props);
      },
      onExit: () => { popup[0].destroy(); component.destroy(); },
    };
  };

  const CustomKeymap = Extension.create({ /* ... Keep Existing ... */
    name: 'customKeymap',
    priority: 1000, 
    addKeyboardShortcuts() {
      return {
        'Enter': ({ editor }) => {
          if (editor.isActive('listItem')) return editor.chain().splitListItem('listItem').run();
          return false; 
        }
      };
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit, Placeholder.configure({ placeholder: "Type '/' for commands..." }),
      HorizontalRule, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      CodeBlock, SlashCommand.configure({ suggestion: { items: getSlashItems, render: renderSlashMenu } }),
      CustomKeymap, 
      // --- NEW EXTENSION ---
      NoteLink.configure({
        onNavigate: (noteId) => {
           if (onNavigate) onNavigate(noteId);
        }
      })
    ],
    content: note.content || '',
    onUpdate: ({ editor }) => {
      onUpdate({ ...note, title, coverImage: cover, content: editor.getHTML() });
    },
  });

  // ... (Keep existing useEffects) ...

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

      {/* --- NEW: NOTE PICKER MODAL --- */}
      {showNotePicker && (
        <NotePicker 
          notes={allNotes.filter(n => n._id !== note._id)} // Don't link to self
          onClose={() => setShowNotePicker(false)}
          onSelect={insertLinkedNote}
        />
      )}

      <div className="editor-container">
        {/* ... (Keep Header) ... */}
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
          <input type="text" placeholder="Untitled" value={title} onChange={handleTitleChange} className="title-input" />
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
