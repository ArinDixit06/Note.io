import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import './NoteLinkComponent.css'; // We will create this CSS next

const NoteLinkComponent = (props) => {
  const { id, title, cover, preview, viewMode, createdAt } = props.node.attrs;
  
  // This function is passed down from NoteEditor to handle navigation
  const onNavigate = props.extension.options.onNavigate;

  const toggleViewMode = (e) => {
    e.stopPropagation(); // Prevent navigation when clicking the toggle button
    const newMode = viewMode === 'card' ? 'link' : 'card';
    props.updateAttributes({ viewMode: newMode });
  };

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate(id);
    }
  };

  // 1. LINK VIEW (Minimal)
  if (viewMode === 'link') {
    return (
      <NodeViewWrapper className="note-link-wrapper-inline">
        <div className="note-link-anchor" onClick={handleLinkClick}>
          <span className="note-icon">📄</span>
          <span className="note-text">{title}</span>
        </div>
        <button 
          className="view-toggle-btn-inline" 
          onClick={toggleViewMode} 
          title="Switch to Card View"
        >
          ☷
        </button>
      </NodeViewWrapper>
    );
  }

  // 2. CARD VIEW (Grid Style 45:55)
  // Logic to render cover style
  const coverStyle = {};
  if (cover) {
     if (cover.startsWith('http')) {
         coverStyle.backgroundImage = `url(${cover})`;
     } else {
         coverStyle.background = cover;
     }
  } else {
     coverStyle.background = `repeating-linear-gradient(45deg, #f7f7f5, #f7f7f5 10px, #f0f0f0 10px, #f0f0f0 20px)`;
  }

  return (
    <NodeViewWrapper className="note-link-wrapper-block">
      <div className="note-link-card" onClick={handleLinkClick}>
        {/* Top Half: Cover */}
        <div className="note-link-cover" style={coverStyle}></div>
        
        {/* Bottom Half: Content */}
        <div className="note-link-content">
          <div className="note-link-header">
            <h4>{title}</h4>
            <span className="note-date">
              {createdAt ? new Date(createdAt).toLocaleDateString() : ''}
            </span>
          </div>
          <p className="note-link-preview">{preview || "No preview available"}</p>
        </div>

        {/* Floating Toggle Button */}
        <button 
          className="view-toggle-btn-card" 
          onClick={toggleViewMode}
          title="Switch to Link View"
        >
          Aa
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export default NoteLinkComponent;