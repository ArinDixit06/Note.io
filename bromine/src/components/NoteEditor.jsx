import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core'; 

// Extensions
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

// --- EXPANDED COVER OPTIONS ---
const COVERS = [
  // Gradients
  "linear-gradient(90deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
  "linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)",
  "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
  "linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)",
  // Solid/Minimal
  "#FFD700", "#FF6B6B", "#4ECDC4", "#1A535C",
  // Images (Nature/Architecture)
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1511300636408-a63a6ad120de?auto=format&fit=crop&w=1200&q=80",
];

const NoteEditor = ({ note, onUpdate, onDelete, onBack }) => {
  const [title, setTitle] = useState(note.title || "");
  const [cover, setCover] = useState(note.coverImage || "");
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  
  // Ref for closing picker when clicking outside
  const pickerRef = useRef(null);

  useEffect(() => {
    // Sync state when prop changes (e.g. loading from DB)
    if (note) {
        setTitle(note.title || "");
        setCover(note.coverImage || "");
    }
  }, [note]);

  // Click outside listener for cover picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowCoverPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getSlashItems = ({ query }) => {
    return [
      { title: 'Text', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(), element: <span>Aa &nbsp; Text</span> },
      { title: 'Heading 1', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(), element: <span>H1 &nbsp; Big Heading</span> },
      { title: 'Heading 2', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(), element: <span>H2 &nbsp; Medium Heading</span> },
      { title: 'Bullet List', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(), element: <span>• &nbsp; Bullet List</span> },
      { title: 'Numbered List', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(), element: <span>1. &nbsp; Numbered List</span> },
      { title: 'Divider', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(), element: <span>— &nbsp; Divider</span> },
      { title: 'Code Block', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setCodeBlock().run(), element: <span>&lt;&gt; &nbsp; Code Block</span> },
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
          if (editor.isActive('listItem')) {
             return editor.chain().splitListItem('listItem').run();
          }
          return false; 
        }
      };
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit, 
      Placeholder.configure({ placeholder: "Type '/' for commands..." }),
      HorizontalRule,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      CodeBlock,
      SlashCommand.configure({ suggestion: { items: getSlashItems, render: renderSlashMenu } }),
      CustomKeymap, 
    ],
    content: note.content || '',
    onUpdate: ({ editor }) => {
      onUpdate({ ...note, title, coverImage: cover, content: editor.getHTML() });
    },
  });

  // Load content if it changes externally
  useEffect(() => {
    if (editor && note._id) {
      if (editor.getHTML() !== note.content) {
        editor.commands.setContent(note.content);
      }
    }
  }, [note._id, editor]);

  // --- COVER FUNCTIONS ---
  const handleCoverSelect = (selectedCover) => {
    setCover(selectedCover);
    setShowCoverPicker(false);
    // Explicitly update parent
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

  if (!editor) return null;

  return (
    <div className="editor-shell" style={{ width: '100%', height: '100%' }}>
      
      {/* Cover Image Area */}
      <div className={`cover-image-container ${cover ? 'visible' : ''}`}>
        {cover.startsWith('linear-gradient') || cover.startsWith('#') ? (
          <div className="cover-image" style={{ background: cover }} />
        ) : (
          <img src={cover} alt="Cover" className="cover-image" />
        )}
        
        {/* Cover Controls (Hover) */}
        <div className="cover-controls" ref={pickerRef}>
          <button className="cover-btn" onClick={() => setShowCoverPicker(!showCoverPicker)}>
            Change Cover
          </button>
          <button className="cover-btn remove-btn" onClick={removeCover}>
            Remove
          </button>

          {/* Cover Picker Popup */}
          {showCoverPicker && (
            <div className="cover-picker-menu">
              {COVERS.map((c, index) => (
                 <div 
                   key={index} 
                   className="cover-option" 
                   onClick={() => handleCoverSelect(c)}
                   style={c.startsWith('http') ? {backgroundImage: `url(${c})`, backgroundSize:'cover'} : {background: c}}
                 />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="editor-container">
        {/* Header */}
        <div className="editor-header">
          <button onClick={onBack} className="secondary-btn">← Back</button>
          <div className="editor-actions">
            <button 
              onClick={() => { if(window.confirm("Delete note?")) onDelete(note._id); }} 
              className="delete-btn"
              style={{ background: 'transparent', border:'none', cursor:'pointer', color:'#FF3B30'}}
            >
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* Add Cover Button (Visible when no cover) */}
        {!cover && (
          <button className="add-cover-btn" onClick={() => {setShowCoverPicker(true); setCover(COVERS[0]);}}>
            🖼️ Add Cover
          </button>
        )}

        {/* Editor Workspace */}
        <div className="editor-workspace">
          <input
            type="text"
            placeholder="Untitled"
            value={title}
            onChange={handleTitleChange}
            className="title-input"
          />
          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;