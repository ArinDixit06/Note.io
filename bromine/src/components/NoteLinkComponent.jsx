import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import './NoteLinkComponent.css';

const NoteLinkComponent = (props) => {
  const { id, title, cover, preview, viewMode, createdAt } = props.node.attrs;
  const onNavigate = props.extension.options.onNavigate;

  const toggleViewMode = (event) => {
    event.stopPropagation();
    props.updateAttributes({ viewMode: viewMode === 'card' ? 'link' : 'card' });
  };

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate(id);
    }
  };

  if (viewMode === 'link') {
    return (
      <NodeViewWrapper className="note-link-wrapper-inline">
        <div className="note-link-anchor" onClick={handleLinkClick}>
          <span className="note-icon">📄</span>
          <span className="note-text">{title}</span>
        </div>
        <button className="view-toggle-btn-inline" onClick={toggleViewMode} title="Switch to card view">
          Card
        </button>
      </NodeViewWrapper>
    );
  }

  const coverStyle = cover
    ? cover.startsWith('http')
      ? { backgroundImage: `url(${cover})` }
      : { background: cover }
    : { background: 'var(--bg-sidebar)' };

  return (
    <NodeViewWrapper className="note-link-wrapper-block">
      <div className="note-link-card" onClick={handleLinkClick}>
        <div className="note-link-cover" style={coverStyle} />
        <div className="note-link-content">
          <div className="note-link-header">
            <h4>{title}</h4>
            <span className="note-date">{createdAt ? new Date(createdAt).toLocaleDateString() : ''}</span>
          </div>
          <p className="note-link-preview">{preview || 'No preview available'}</p>
        </div>
        <button className="view-toggle-btn-card" onClick={toggleViewMode} title="Switch to link view">
          Link
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export default NoteLinkComponent;
