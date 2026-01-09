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

// =========================================
// 1. EXPANDED & FIXED COVERS LIST
// =========================================
const COVERS = [
  // --- SOLID COLORS (Classic & Modern) ---
  "#E5E5E5", // Light Gray
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
  "#3D348B", // Deep Indigo
  "#7678ED", // Soft Purple
  "#F18701", // Bright Tangerine

  // --- GRADIENTS (Smooth & Vibrant) ---
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
  "linear-gradient(to right, #f83600 0%, #f9d423 100%)", // Fire
  "linear-gradient(to top, #0ba360 0%, #3cba92 100%)",   // Emerald

  // --- NATURE (High Quality Unsplash) ---
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80", // Mountains
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80", // Foggy Forest
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80", // Sunlight Forest
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80", // Grass Field
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1200&q=80", // Dark Ocean
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80", // Lake & Boat // Sakura (Cherry Blossoms)
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", // Beach
  
  // --- SPACE & DARK (High Contrast) ---
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80", // Earth from Space
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=80", // Starry Night
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80", // Nebula
  "https://images.unsplash.com/photo-1481026469463-66327c86e544?auto=format&fit=crop&w=1200&q=80", // Dark Room

  // --- ABSTRACT & TEXTURE ---
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80", // Liquid Purple
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80", // Abstract Paint
  "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1200&q=80", // Geometric Lines
  "https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=1200&q=80", // Abstract Shapes
  "https://images.unsplash.com/photo-1534237710431-e2fc698436d0?auto=format&fit=crop&w=1200&q=80", // Building Detail
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80", // Minimal Desk
  "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=80", // Gold Texture
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80", // Minimal Interior
];

const NoteEditor = ({ note, onUpdate, onDelete, onBack, allNotes, onNavigate }) => {
  const [title, setTitle] = useState(note.title || "");
  const [cover, setCover] = useState(note.coverImage || "");
  const [showCoverPicker, setShowCoverPicker] = useState(false);
   
  // --- STATE FOR NOTE PICKER ---
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [pickerRange, setPickerRange] = useState(null); 

  const pickerRef = useRef(null);

  useEffect(() => {
    if (note) {
        setTitle(note.title || "");
        setCover(note.coverImage || "");
    }
  }, [note]);

  // Click outside to close cover picker
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowCoverPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerRef]);

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

  // --- Handle Note Selection from Picker ---
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
          editor.chain().focus().deleteRange(range).run();
          setPickerRange(range.from);
          setShowNotePicker(true);
        }, 
        element: <span>🔗 &nbsp; Link Note</span> 
      },
    ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
  };

  const renderSlashMenu = () => {
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

  const CustomKeymap = Extension.create({
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

  if (!editor) return null;

  return (
    <div className="editor-shell" style={{ width: '100%', height: '100%' }}>
      
      {/* ======================= COVER LOGIC ======================= */}
      <div className={`cover-image-container ${cover ? 'visible' : ''}`}>
        
        {/* Render Logic: Supports Gradients, Hex Colors, and URLs */}
        {cover.startsWith('linear-gradient') || cover.startsWith('#') ? (
          <div className="cover-image" style={{ background: cover }} />
        ) : (
          <img 
            src={cover} 
            alt="Cover" 
            className="cover-image" 
            style={{ objectFit: 'cover', width: '100%', height: '100%' }} // Ensure image fits
          />
        )}

        <div className="cover-controls" ref={pickerRef}>
          <button className="cover-btn" onClick={() => setShowCoverPicker(!showCoverPicker)}>Change Cover</button>
          <button className="cover-btn remove-btn" onClick={removeCover}>Remove</button>
          
          {showCoverPicker && (
            <div className="cover-picker-menu">
              {COVERS.map((c, index) => (
                 <div 
                    key={index} 
                    className="cover-option" 
                    onClick={() => handleCoverSelect(c)} 
                    // Safe logic to determine if it is a URL or a CSS value
                    style={
                        c.startsWith('http') 
                        ? { backgroundImage: `url(${c})`, backgroundSize:'cover' } 
                        : { background: c }
                    } 
                 />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ========================================================== */}

      {/* --- NOTE PICKER MODAL --- */}
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
          <input type="text" placeholder="Untitled" value={title} onChange={handleTitleChange} className="title-input" />
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
