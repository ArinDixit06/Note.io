import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import NoteLinkComponent from '../components/NoteLinkComponent';

export default Node.create({
  name: 'noteLink',

  group: 'block',

  atom: true, // It is a single unit, not editable text inside

  addAttributes() {
    return {
      id: {
        default: null,
      },
      title: {
        default: 'Untitled Note',
      },
      cover: {
        default: null, // Stores cover image URL or color
      },
      preview: {
        default: '',
      },
      viewMode: {
        default: 'card', // Options: 'card' or 'link'
      },
      createdAt: {
        default: null,
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'note-link',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['note-link', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteLinkComponent);
  },
});