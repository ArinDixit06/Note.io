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
import PdfAttachmentViewer from './PdfAttachmentViewer';
import { exportNoteAsPdf } from '../exportNotePdf';

const COVERS = [
  '#f7f1ea',
  '#f3ebe1',
  '#efe5dc',
  '#f0ede6',
  '#f5e7d7',
  '#ebdfd2',
  '#e6efe8',
  '#e4edf5',
  '#efe6f4',
  '#f6e4e2',
];

const STATUSES = ['Draft', 'In Review', 'Published', 'Blocked'];

const statusTone = (status) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('publish')) return 'green';
  if (normalized.includes('review')) return 'blue';
  if (normalized.includes('block')) return 'red';
  if (normalized.includes('draft')) return 'gray';
  return 'brown';
};

const formatFileSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const NoteEditor = ({
  note,
  account,
  workspace,
  members,
  folders,
  onUpdate,
  onDelete,
  onUploadAttachment,
  onDeleteAttachment,
  onSaveAttachmentHighlights,
  getAttachmentDownloadUrl,
  onCreateShareLink,
  onBack,
  allNotes,
  onNavigate,
}) => {
  const [title, setTitle] = useState(note.title || '');
  const [cover, setCover] = useState(note.coverImage || '');
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [pickerRange, setPickerRange] = useState(null);
  const [status, setStatus] = useState(note.status || 'Draft');
  const [tagsInput, setTagsInput] = useState((note.tags || []).join(', '));
  const [favorite, setFavorite] = useState(Boolean(note.favorite));
  const [archived, setArchived] = useState(Boolean(note.archived));
  const [folderId, setFolderId] = useState(note.folderId || '');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const titleRef = useRef(null);
  const attachmentInputRef = useRef(null);

  const commit = (patch = {}, editorInstance = editor) => {
    onUpdate({
      ...note,
      title,
      coverImage: cover,
      folderId: folderId || null,
      content: editorInstance?.getHTML() || note.content || '',
      status,
      tags: tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      favorite,
      archived,
      ownerName: note.ownerName || account.fullName,
      ownerRole: note.ownerRole || account.title,
      lastViewedAt: new Date().toISOString(),
      ...patch,
    });
  };

  const adjustTitleHeight = () => {
    const textarea = titleRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    adjustTitleHeight();
  }, [title]);

  useEffect(() => {
    setFolderId(note.folderId || '');
  }, [note.folderId]);

  const handleCoverSelect = (selectedCover) => {
    setCover(selectedCover);
    setShowCoverPicker(false);
    commit({ coverImage: selectedCover });
  };

  const insertLinkedNote = (selectedNote) => {
    if (!editor || !pickerRange) return;

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

  const handlePdfSelection = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !onUploadAttachment) {
      return;
    }

    setIsUploadingAttachment(true);

    try {
      await onUploadAttachment(note._id, file);
    } catch (error) {
      window.alert(error.message || 'Failed to upload PDF.');
    } finally {
      event.target.value = '';
      setIsUploadingAttachment(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      await exportNoteAsPdf({
        title: title || note.title || 'Untitled',
        content: editor?.getHTML() || note.content || '',
      });
    } catch (error) {
      window.alert(error.message || 'Failed to export PDF.');
    }
  };

  const handleCreateShareLink = async () => {
    if (!onCreateShareLink) {
      return;
    }

    setIsCreatingShareLink(true);

    try {
      const payload = await onCreateShareLink(note._id);
      const shareUrl = payload?.shareUrl || '';

      if (!shareUrl) {
        throw new Error('Share link was not returned.');
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }

      window.alert('Collaborative link copied. Anyone who opens it while logged in will get edit access to this note.');
    } catch (error) {
      window.alert(error.message || 'Failed to create collaborative link.');
    } finally {
      setIsCreatingShareLink(false);
    }
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
        element: <span>Bullet List</span>,
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
        element: <span>Divider</span>,
      },
      {
        title: 'Code Block',
        command: ({ editor: instance, range }) =>
          instance.chain().focus().deleteRange(range).setCodeBlock().run(),
        element: <span>Code Block</span>,
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
          if (onNavigate) onNavigate(noteId);
        },
      }),
    ],
    content: note.content || '',
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      commit({}, instance);
    },
  });

  if (!editor) return null;

  return (
    <div className="editor-shell">
      <div className={`cover-image-container ${cover ? 'visible' : ''}`}>
        <div
          className="cover-image"
          style={cover.startsWith('http') ? { backgroundImage: `url(${cover})` } : { background: cover }}
        />
        <div className="cover-controls">
          <button className="button" onClick={() => setShowCoverPicker((value) => !value)}>
            Change cover
          </button>
          <button
            className="button"
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

      <div className="page-shell">
        <div className="page-content">
          <div className="breadcrumb">
            {workspace?.icon || '[]'} {workspace?.name || 'Workspace'} / {note.title || 'Untitled'}
          </div>

          <div className="editor-header">
            <button onClick={onBack} className="button">
              Back
            </button>
            <div className="editor-actions">
              <button
                onClick={() => {
                  const nextValue = !favorite;
                  setFavorite(nextValue);
                  commit({ favorite: nextValue });
                }}
                className="button"
              >
                {favorite ? 'Unfavorite' : 'Favorite'}
              </button>
              <button
                onClick={() => {
                  const nextValue = !archived;
                  setArchived(nextValue);
                  commit({ archived: nextValue });
                }}
                className="button"
              >
                {archived ? 'Restore' : 'Archive'}
              </button>
              <button
                onClick={() => attachmentInputRef.current?.click()}
                className="button"
                disabled={isUploadingAttachment}
              >
                {isUploadingAttachment ? 'Uploading PDF...' : 'Attach PDF'}
              </button>
              <button onClick={handleExportPdf} className="button">
                Export PDF
              </button>
              <button onClick={handleCreateShareLink} className="button" disabled={isCreatingShareLink}>
                {isCreatingShareLink ? 'Creating link...' : 'Share link'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Delete page?')) onDelete(note._id);
                }}
                className="button button-danger"
                disabled={!note.canDelete}
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
              Add cover
            </button>
          ) : null}

          <div className="page-icon">{workspace?.icon || '[]'}</div>

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

          <div className="presence-row">
            <div className="presence-stack">
              {members.slice(0, 6).map((member) => (
                <span key={member.membershipId} className="presence-avatar" title={`${member.fullName} · ${member.role}`}>
                  {member.avatarSeed}
                </span>
              ))}
            </div>
            <span className="meta-inline">
              Last edited by {note.lastEditedByName || account.fullName}{' '}
              {note.updatedAt ? `on ${new Date(note.updatedAt).toLocaleString()}` : ''}
            </span>
          </div>

          <div className="property-table">
            <label className="property-row">
              <span className="property-name">Owner</span>
              <span className="property-value-text">
                {note.ownerName || account.fullName} · {note.ownerRole || account.title}
              </span>
            </label>
            <label className="property-row">
              <span className="property-name">Workspace</span>
              <span className="property-value-text">{workspace?.name}</span>
            </label>
            <label className="property-row">
              <span className="property-name">Folder</span>
              <select
                value={folderId}
                disabled={!folders.length}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setFolderId(nextValue);
                  commit({ folderId: nextValue || null });
                }}
              >
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="property-row">
              <span className="property-name">Status</span>
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
            <label className="property-row property-row-tags">
              <span className="property-name">Tags</span>
              <div className="property-tags-field">
                <input
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  onBlur={() => commit()}
                  placeholder="brief, strategy, docs"
                />
                <div className="property-inline-chips">
                  {tagsInput
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((tag) => (
                      <span key={tag} className="property-chip property-chip-blue">
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
            </label>
          </div>

          <div className="title-support">
            {note.folderName ? <span className="property-chip property-chip-brown">{note.folderName}</span> : null}
            <span className={`property-chip property-chip-${statusTone(status)}`}>{status}</span>
            <span className="meta-inline">{workspace?.name}</span>
            <span className="meta-inline">{note.ownerName || account.fullName}</span>
          </div>

          <input
            ref={attachmentInputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={handlePdfSelection}
          />

          <EditorContent editor={editor} className="tiptap-editor" />

          <section className="attachment-panel">
            <div className="attachment-panel-header">
              <div>
                <p className="eyebrow">PDF Attachments</p>
                <h3>Reference files inside this note</h3>
              </div>
              <button className="button" onClick={() => attachmentInputRef.current?.click()} disabled={isUploadingAttachment}>
                {isUploadingAttachment ? 'Uploading...' : 'Add PDF'}
              </button>
            </div>

            {note.attachments?.length ? (
              <div className="attachment-list">
                {note.attachments.map((attachment) => (
                    <article key={attachment.id} className="attachment-card">
                      <div className="attachment-card-header">
                        <div>
                          <strong>{attachment.fileName}</strong>
                          <span>{formatFileSize(attachment.fileSizeBytes)} • PDF</span>
                        </div>
                        <div className="attachment-actions">
                          <button
                            className="button button-danger"
                            onClick={async () => {
                              try {
                                await onDeleteAttachment(note._id, attachment.id);
                              } catch (error) {
                                window.alert(error.message || 'Failed to remove PDF.');
                              }
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {attachment?.dataBase64 ? (
                        <PdfAttachmentViewer
                          attachment={attachment}
                          onSaveHighlights={(attachmentId, payload) =>
                            onSaveAttachmentHighlights?.(note._id, attachmentId, payload)
                          }
                          getAttachmentDownloadUrl={(attachmentId) => getAttachmentDownloadUrl(note._id, attachmentId)}
                        />
                      ) : (
                        <p className="empty-state">Loading PDF preview...</p>
                      )}
                    </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Attach a PDF to keep manuals, invoices, or reading material inside this note.</p>
            )}
          </section>

          <div className="comment-zone">
            {note.isShared
              ? 'Shared note access is active here. This page was added through a collaborative link and appears in your all pages view.'
              : 'Presence is ambient here. Invite collaborators by adding them to the workspace.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
