import React, { useEffect, useRef, useState } from 'react';
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

const COVERS = [
  'linear-gradient(90deg, #fb7185 0%, #fdba74 45%, #fde68a 100%)',
  'linear-gradient(120deg, #38bdf8 0%, #0f172a 100%)',
  'linear-gradient(120deg, #22c55e 0%, #0f766e 100%)',
  'linear-gradient(120deg, #c084fc 0%, #f43f5e 100%)',
  'linear-gradient(120deg, #94a3b8 0%, #111827 100%)',
  '#f97316',
  '#0891b2',
  '#14b8a6',
  '#111827',
  '#475569',
];

const STATUSES = ['Draft', 'In Review', 'Published', 'Blocked'];

const NoteEditor = ({ note, profile, onUpdate, onDelete, onBack, allNotes, onNavigate }) => {
  const [title, setTitle] = useState(note.title || '');
  const [cover, setCover] = useState(note.coverImage || '');
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [pickerRange, setPickerRange] = useState(null);
  const [workspace, setWorkspace] = useState(note.workspace || profile.workspaceName);
  const [status, setStatus] = useState(note.status || 'Draft');
  const [tagsInput, setTagsInput] = useState((note.tags || []).join(', '));
  const [favorite, setFavorite] = useState(Boolean(note.favorite));
  const [archived, setArchived] = useState(Boolean(note.archived));
  const titleRef = useRef(null);

  useEffect(() => {
    setTitle(note.title || '');
    setCover(note.coverImage || '');
    setWorkspace(note.workspace || profile.workspaceName);
    setStatus(note.status || 'Draft');
    setTagsInput((note.tags || []).join(', '));
    setFavorite(Boolean(note.favorite));
    setArchived(Boolean(note.archived));
  }, [note, profile.workspaceName]);

  const commit = (patch = {}, editorInstance = editor) => {
    onUpdate({
      ...note,
      title,
      coverImage: cover,
      content: editorInstance?.getHTML() || note.content || '',
      workspace,
      status,
      tags: tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      favorite,
      archived,
      ownerName: profile.fullName,
      ownerRole: profile.role,
      profileId: profile.id,
      lastViewedAt: new Date().toISOString(),
      ...patch,
    });
  };

  const adjustTitleHeight = () => {
    const textarea = titleRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    adjustTitleHeight();
  }, [title]);

  const handleCoverSelect = (selectedCover) => {
    setCover(selectedCover);
    setShowCoverPicker(false);
    commit({ coverImage: selectedCover });
  };

  const insertLinkedNote = (selectedNote) => {
    if (!editor || !pickerRange) {
      return;
    }

    const previewText = selectedNote.content?.replace(/<[^>]+>/g, ' ').slice(0, 100) || 'No preview';

    editor
      .chain()
      .focus()
      .insertContentAt(pickerRange, {
        type: 'noteLink',
        attrs: {
          id: selectedNote._id,
          title: selectedNote.title,
          cover: selectedNote.coverImage,
          preview: previewText,
          createdAt: selectedNote.createdAt,
          viewMode: 'card',
        },
      })
      .run();

    setShowNotePicker(false);
  };

  const getSlashItems = ({ query }) =>
    [
      {
        title: 'Text',
        command: ({ editor: instance, range }) =>
          instance.chain().focus().deleteRange(range).setParagraph().run(),
        element: <span>Aa Text</span>,
      },
      {
        title: 'Heading 1',
        command: ({ editor: instance, range }) =>
          instance.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
        element: <span>H1 Big Heading</span>,
      },
      {
        title: 'Heading 2',
        command: ({ editor: instance, range }) =>
          instance.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
        element: <span>H2 Section Heading</span>,
      },
      {
        title: 'Bullet List',
        command: ({ editor: instance, range }) =>
          instance.chain().focus().deleteRange(range).toggleBulletList().run(),
        element: <span>• Bullet List</span>,
      },
      {
        title: 'Numbered List',
        command: ({ editor: instance, range }) =>
          instance.chain().focus().deleteRange(range).toggleOrderedList().run(),
        element: <span>1. Numbered List</span>,
      },
      {
        title: 'Divider',
        command: ({ editor: instance, range }) =>
          instance.chain().focus().deleteRange(range).setHorizontalRule().run(),
        element: <span>— Divider</span>,
      },
      {
        title: 'Code Block',
        command: ({ editor: instance, range }) =>
          instance.chain().focus().deleteRange(range).setCodeBlock().run(),
        element: <span>&lt;/&gt; Code Block</span>,
      },
      {
        title: 'Link to Note',
        command: ({ editor: instance, range }) => {
          instance.chain().focus().deleteRange(range).run();
          setPickerRange(range.from);
          setShowNotePicker(true);
        },
        element: <span>Link Note</span>,
      },
    ].filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));

  const renderSlashMenu = () => {
    let component;
    let popup;

    return {
      onStart: (props) => {
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
      onUpdate: (props) => {
        component.updateProps(props);
        if (!props.clientRect) return;
        popup[0].setProps({ getReferenceClientRect: props.clientRect });
      },
      onKeyDown: (props) => {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        return component.ref?.onKeyDown(props);
      },
      onExit: () => {
        popup[0].destroy();
        component.destroy();
      },
    };
  };

  const CustomKeymap = Extension.create({
    name: 'customKeymap',
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        Enter: ({ editor: instance }) => {
          if (instance.isActive('listItem')) {
            return instance.chain().splitListItem('listItem').run();
          }

          return false;
        },
      };
    },
  });

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
      SlashCommand.configure({ suggestion: { items: getSlashItems, render: renderSlashMenu } }),
      CustomKeymap,
      NoteLink.configure({
        onNavigate: (noteId) => {
          if (onNavigate) {
            onNavigate(noteId);
          }
        },
      }),
    ],
    content: note.content || '',
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      commit({}, instance);
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-shell">
      <div className={`cover-image-container ${cover ? 'visible' : ''}`}>
        <div
          className="cover-image"
          style={cover.startsWith('http') ? { backgroundImage: `url(${cover})` } : { background: cover }}
        />
        <div className="cover-controls">
          <button className="cover-btn" onClick={() => setShowCoverPicker((value) => !value)}>
            Change Cover
          </button>
          <button
            className="cover-btn remove-btn"
            onClick={() => {
              setCover('');
              commit({ coverImage: '' });
            }}
          >
            Remove
          </button>
          {showCoverPicker ? (
            <div className="cover-picker-menu">
              {COVERS.map((option) => (
                <button
                  key={option}
                  className="cover-option"
                  onClick={() => handleCoverSelect(option)}
                  style={{ background: option }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {showNotePicker ? (
        <NotePicker
          notes={allNotes.filter((item) => item._id !== note._id)}
          onClose={() => setShowNotePicker(false)}
          onSelect={insertLinkedNote}
        />
      ) : null}

      <div className="editor-container">
        <div className="editor-header">
          <button onClick={onBack} className="secondary-btn">
            Back
          </button>
          <div className="editor-actions">
            <button
              onClick={() => {
                const nextValue = !favorite;
                setFavorite(nextValue);
                commit({ favorite: nextValue });
              }}
              className="secondary-btn"
            >
              {favorite ? 'Unfavorite' : 'Favorite'}
            </button>
            <button
              onClick={() => {
                const nextValue = !archived;
                setArchived(nextValue);
                commit({ archived: nextValue });
              }}
              className="secondary-btn"
            >
              {archived ? 'Restore' : 'Archive'}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete note?')) onDelete(note._id);
              }}
              className="delete-btn"
            >
              Delete
            </button>
          </div>
        </div>

        {!cover ? (
          <button
            className="add-cover-btn"
            onClick={() => {
              setShowCoverPicker(true);
              setCover(COVERS[0]);
              commit({ coverImage: COVERS[0] });
            }}
          >
            Add Cover
          </button>
        ) : null}

        <div className="editor-meta-panel">
          <div className="meta-card profile-owner">
            <span className="meta-label">Owner Profile</span>
            <strong>{profile.fullName}</strong>
            <small>{profile.role}</small>
          </div>
          <label className="meta-card">
            <span className="meta-label">Workspace</span>
            <input
              value={workspace}
              onChange={(event) => {
                const nextValue = event.target.value;
                setWorkspace(nextValue);
                commit({ workspace: nextValue });
              }}
            />
          </label>
          <label className="meta-card">
            <span className="meta-label">Status</span>
            <select
              value={status}
              onChange={(event) => {
                const nextValue = event.target.value;
                setStatus(nextValue);
                commit({ status: nextValue });
              }}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="meta-card meta-card-wide">
            <span className="meta-label">Tags</span>
            <input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              onBlur={() => commit()}
              placeholder="docs, planning, sprint"
            />
          </label>
        </div>

        <div className="editor-workspace">
          <textarea
            ref={titleRef}
            placeholder="Untitled"
            value={title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              commit({ title: nextTitle });
            }}
            className="title-input"
            rows={1}
            spellCheck={false}
          />

          <div className="title-support">
            <span>{workspace}</span>
            <span>{status}</span>
            <span>{profile.fullName}</span>
          </div>

          <EditorContent editor={editor} className="tiptap-editor" />
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
