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
// COVERS
// =========================================
const COVERS = [
  "#E5E5E5", "#FFD700", "#FF6B6B", "#4ECDC4",
  "linear-gradient(120deg,#a1c4fd,#c2e9fb)",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
];

// =========================================
// NOTE EDITOR (FIXED)
// =========================================
const NoteEditor = ({ note, onUpdate, onDelete, onBack, allNotes, onNavigate }) => {

  // ===== SINGLE SOURCE OF TRUTH =====
  const [title, setTitle] = useState(note.title || "");
  const [cover, setCover] = useState(note.coverImage || "");
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  const [showNotePicker, setShowNotePicker] = useState(false);
  const [pickerRange, setPickerRange] = useState(null);

  const pickerRef = useRef(null);

  // ===== HYDRATE ONLY WHEN NOTE CHANGES =====
  useEffect(() => {
    setTitle(note.title || "");
    setCover(note.coverImage || "");
    editor?.commands.setContent(note.content || "");
  }, [note._id]);

  // ===== CLICK OUTSIDE COVER PICKER =====
  useEffect(() => {
    const close = e => pickerRef.current && !pickerRef.current.contains(e.target) && setShowCoverPicker(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ===== SAVE HELPERS =====
  const save = (extra = {}) => {
    onUpdate({
      ...note,
      title,
      coverImage: cover,
      content: editor.getHTML(),
      ...extra,
    });
  };

  // ===== COVER ACTIONS =====
  const handleCoverSelect = (c) => {
    setCover(c);
    setShowCoverPicker(false);
    save({ coverImage: c });
  };

  const removeCover = () => {
    setCover("");
    save({ coverImage: "" });
  };

  const handleAddCover = () => {
    const c = COVERS[0];
    setCover(c);
    setShowCoverPicker(true);
    save({ coverImage: c });
  };

  // ===== TITLE =====
  const handleTitleChange = e => {
    setTitle(e.target.value);
    save({ title: e.target.value });
  };

  // ===== TIPTAP =====
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Type '/' for commands..." }),
      HorizontalRule,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      CodeBlock,
      SlashCommand.configure({
        suggestion: {
          items: ({ query }) => [
            {
              title: 'Text',
              command: ({ editor, range }) =>
                editor.chain().focus().deleteRange(range).setParagraph().run(),
              element: <span>Aa Text</span>,
            },
            {
              title: 'Link to Note',
              command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).run();
                setPickerRange(range.from);
                setShowNotePicker(true);
              },
              element: <span>🔗 Link Note</span>,
            },
          ],
          render: () => {
            let component, popup;
            return {
              onStart: props => {
                component = new ReactRenderer(SlashMenu, { props, editor: props.editor });
                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                });
              },
              onUpdate: props => component.updateProps(props),
              onExit: () => popup[0].destroy(),
            };
          },
        },
      }),
      NoteLink.configure({
        onNavigate: id => onNavigate?.(id),
      }),
    ],
    content: note.content || "",
    // 🚫 IMPORTANT: CONTENT ONLY — NO COVER HERE
    onUpdate: ({ editor }) => {
      onUpdate({ ...note, title, content: editor.getHTML() });
    },
  });

  if (!editor) return null;

  // ===== RENDER =====
  return (
    <div className="editor-shell">

      {/* COVER */}
      {cover && (
        <div className="cover-image-container">
          {cover.startsWith('http')
            ? <img src={cover} className="cover-image" />
            : <div className="cover-image" style={{ background: cover }} />
          }

          <div className="cover-controls" ref={pickerRef}>
            <button onClick={() => setShowCoverPicker(!showCoverPicker)}>Change</button>
            <button onClick={removeCover}>Remove</button>

            {showCoverPicker && (
              <div className="cover-picker-menu">
                {COVERS.map((c, i) => (
                  <div
                    key={i}
                    className="cover-option"
                    style={c.startsWith('http') ? { backgroundImage: `url(${c})` } : { background: c }}
                    onClick={() => handleCoverSelect(c)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!cover && (
        <button className="add-cover-btn" onClick={handleAddCover}>
          Add Cover
        </button>
      )}

      {/* HEADER */}
      <div className="editor-header">
        <button onClick={onBack}>← Back</button>
        <button onClick={() => window.confirm("Delete?") && onDelete(note._id)}>🗑️</button>
      </div>

      {/* CONTENT */}
      <input
        className="title-input"
        value={title}
        placeholder="Untitled"
        onChange={handleTitleChange}
      />

      <EditorContent editor={editor} />

      {/* NOTE PICKER */}
      {showNotePicker && (
        <NotePicker
          notes={allNotes.filter(n => n._id !== note._id)}
          onClose={() => setShowNotePicker(false)}
          onSelect={n => {
            editor.chain().focus().insertContent({
              type: 'noteLink',
              attrs: n,
            }).run();
            setShowNotePicker(false);
          }}
        />
      )}
    </div>
  );
};

export default NoteEditor;
