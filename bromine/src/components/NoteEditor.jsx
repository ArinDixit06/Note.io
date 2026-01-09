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

import NoteLink from '../extensions/NoteLink';
import NotePicker from './NotePicker';

// =========================================
// 1. EXPANDED COVERS LIST
// =========================================
const COVERS = [
  "#E5E5E5", "#FFD700", "#FF6B6B", "#4ECDC4", "#1A535C",
  "#F7FFF7", "#FFE66D", "#292F36", "#5F0F40", "#9A031E",
  "#FB8B24", "#3D348B", "#7678ED", "#F18701",

  "linear-gradient(90deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
  "linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)",
  "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
  "linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(120deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(to right, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(to top, #30cfd0 0%, #330867 100%)",
  "linear-gradient(to top, #5ee7df 0%, #b490ca 100%)",
  "linear-gradient(to right, #b8cbb8 0%, #b465da 33%, #ee609c 66%)",
  "linear-gradient(to right, #6a11cb 0%, #2575fc 100%)",
  "linear-gradient(to top, #c471f5 0%, #fa71cd 100%)",
  "linear-gradient(to right, #f83600 0%, #f9d423 100%)",
  "linear-gradient(to top, #0ba360 0%, #3cba92 100%)",

  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
];

const NoteEditor = ({ note, onUpdate, onDelete, onBack, allNotes, onNavigate }) => {
  const [title, setTitle] = useState(note.title || "");
  const [cover, setCover] = useState(note.coverImage || "");
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [pickerRange, setPickerRange] = useState(null);

  const pickerRef = useRef(null);

  // 🔧 FIX #1 — hydrate ONLY when switching notes
  useEffect(() => {
    if (note) {
      setTitle(note.title || "");
      setCover(note.coverImage || "");
      editor?.commands.setContent(note.content || "");
    }
  }, [note._id]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowCoverPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCoverSelect = (selectedCover) => {
    setCover(selectedCover);
    setShowCoverPicker(false);
    onUpdate({ ...note, title, content: editor.getHTML(), coverImage: selectedCover });
  };

  const removeCover = () => {
    setCover("");
    onUpdate({ ...note, title, content: editor.getHTML(), coverImage: "" });
  };

  const handleAddCover = () => {
    const defaultCover = COVERS[0];
    setCover(defaultCover);
    setShowCoverPicker(true);
    onUpdate({ ...note, title, content: editor.getHTML(), coverImage: defaultCover });
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    onUpdate({ ...note, title: e.target.value, content: editor.getHTML(), coverImage: cover });
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Type '/' for commands..." }),
      HorizontalRule,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlock,
      SlashCommand.configure({
        suggestion: {
          items: () => [],
          render: () => ({}),
        },
      }),
      Extension.create({
        name: 'customKeymap',
        priority: 1000,
        addKeyboardShortcuts() {
          return {
            Enter: ({ editor }) =>
              editor.isActive('listItem')
                ? editor.chain().splitListItem('listItem').run()
                : false,
          };
        },
      }),
      NoteLink.configure({
        onNavigate: (noteId) => onNavigate && onNavigate(noteId),
      }),
    ],
    content: note.content || '',
    // 🔧 FIX #2 — TipTap updates CONTENT ONLY
    onUpdate: ({ editor }) => {
      onUpdate({ ...note, title, content: editor.getHTML() });
    },
  });

  if (!editor) return null;

  return (
    <div className="editor-shell" style={{ width: '100%', height: '100%' }}>
      <div className={`cover-image-container ${cover ? 'visible' : ''}`}>
        {cover && (
          cover.startsWith('linear-gradient') || cover.startsWith('#') ? (
            <div className="cover-image" style={{ background: cover }} />
          ) : (
            <img
              src={cover}
              alt="Cover"
              className="cover-image"
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          )
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
                  style={
                    c.startsWith('http')
                      ? { backgroundImage: `url(${c})`, backgroundSize: 'cover' }
                      : { background: c }
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="editor-container">
        <div className="editor-header">
          <button onClick={onBack} className="secondary-btn">← Back</button>
          <div className="editor-actions">
            <button
              onClick={() => window.confirm("Delete note?") && onDelete(note._id)}
              className="delete-btn"
            >
              🗑️ Delete
            </button>
          </div>
        </div>

        {!cover && (
          <button className="add-cover-btn" onClick={handleAddCover}>
            Add Cover
          </button>
        )}

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
