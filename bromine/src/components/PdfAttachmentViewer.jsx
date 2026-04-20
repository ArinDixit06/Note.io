import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: 'Yellow', hex: '#ffe066', rgb: [1, 0.878, 0.4] },
  { id: 'green', label: 'Green', hex: '#8ce99a', rgb: [0.549, 0.914, 0.604] },
  { id: 'blue', label: 'Blue', hex: '#74c0fc', rgb: [0.455, 0.753, 0.988] },
  { id: 'pink', label: 'Pink', hex: '#faa2c1', rgb: [0.98, 0.635, 0.757] },
];

const DEFAULT_SCALE = 1.35;
const SAVED_HIGHLIGHT_OPACITY = 0.16;

const base64ToUint8Array = (value) => {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const uint8ArrayToBase64 = (bytes) => {
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return window.btoa(binary);
};

const buildHighlightedPdf = async (sourceDataBase64, highlights) => {
  const pdfDoc = await PDFDocument.load(base64ToUint8Array(sourceDataBase64));
  const pages = pdfDoc.getPages();

  highlights.forEach((highlight) => {
    const page = pages[highlight.pageIndex];

    if (!page) {
      return;
    }

    const color = HIGHLIGHT_COLORS.find((item) => item.id === highlight.colorId) || HIGHLIGHT_COLORS[0];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    highlight.rects.forEach((rect) => {
      page.drawRectangle({
        x: rect.x * pageWidth,
        y: pageHeight - (rect.y + rect.height) * pageHeight,
        width: rect.width * pageWidth,
        height: rect.height * pageHeight,
        color: rgb(...color.rgb),
        opacity: SAVED_HIGHLIGHT_OPACITY,
        borderOpacity: 0,
      });
    });
  });

  const pdfBytes = await pdfDoc.save();
  return uint8ArrayToBase64(pdfBytes);
};

const PdfAttachmentViewer = ({ attachment, onSaveHighlights, getAttachmentDownloadUrl }) => {
  const containerRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [isRendering, setIsRendering] = useState(true);
  const [activeColorId, setActiveColorId] = useState(HIGHLIGHT_COLORS[0].id);
  const [activeSelection, setActiveSelection] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isEraserActive, setIsEraserActive] = useState(false);

  const highlights = useMemo(() => attachment.highlights || [], [attachment.highlights]);

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      if (!attachment?.dataBase64) {
        setPages([]);
        setIsRendering(false);
        return;
      }

      setIsRendering(true);

      try {
        const loadingTask = pdfjsLib.getDocument({ data: base64ToUint8Array(attachment.dataBase64) });
        const pdf = await loadingTask.promise;
        const nextPages = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: DEFAULT_SCALE });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport }).promise;

          const textContent = await page.getTextContent();
          nextPages.push({
            pageIndex: pageNumber - 1,
            width: viewport.width,
            height: viewport.height,
            image: canvas.toDataURL('image/png'),
            textItems: textContent.items.map((item) => {
              const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
              const fontHeight = Math.hypot(transform[2], transform[3]);
              const x = transform[4];
              const y = transform[5] - fontHeight;

              return {
                text: item.str,
                x,
                y,
                width: item.width * viewport.scale,
                height: fontHeight,
                fontSize: fontHeight,
              };
            }),
          });
        }

        if (!cancelled) {
          setPages(nextPages);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to render PDF', error);
          setPages([]);
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [attachment?.dataBase64]);

  useEffect(() => {
    setCurrentPageIndex(0);
    setActiveSelection(null);
    setIsEraserActive(false);
  }, [attachment?.id, pages.length]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!containerRef.current) {
        return;
      }

      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setActiveSelection(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const commonNode =
        range.commonAncestorContainer.nodeType === 3
          ? range.commonAncestorContainer.parentElement
          : range.commonAncestorContainer;

      const pageElement = commonNode?.closest?.('.pdf-page');

      if (!pageElement || !containerRef.current.contains(pageElement)) {
        setActiveSelection(null);
        return;
      }

      const pageRect = pageElement.getBoundingClientRect();
      const rects = Array.from(range.getClientRects())
        .map((rect) => ({
          x: (rect.left - pageRect.left) / pageRect.width,
          y: (rect.top - pageRect.top) / pageRect.height,
          width: rect.width / pageRect.width,
          height: rect.height / pageRect.height,
        }))
        .filter((rect) => rect.width > 0 && rect.height > 0);

      if (!rects.length) {
        setActiveSelection(null);
        return;
      }

      setActiveSelection({
        pageIndex: Number(pageElement.dataset.pageIndex),
        rects,
        text: selection.toString().trim(),
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const groupedHighlights = useMemo(
    () =>
      highlights.reduce((accumulator, highlight) => {
        if (!accumulator[highlight.pageIndex]) {
          accumulator[highlight.pageIndex] = [];
        }

        accumulator[highlight.pageIndex].push(highlight);
        return accumulator;
      }, {}),
    [highlights]
  );

  const currentPage = pages[currentPageIndex] || null;
  const totalPages = pages.length;

  const saveHighlights = async (nextHighlights) => {
    setIsSaving(true);

    try {
      const sourceDataBase64 = attachment.sourceDataBase64 || attachment.dataBase64;
      const dataBase64 = await buildHighlightedPdf(sourceDataBase64, nextHighlights);
      await onSaveHighlights(attachment.id, {
        highlights: nextHighlights,
        dataBase64,
        sourceDataBase64,
      });
      window.getSelection()?.removeAllRanges();
      setActiveSelection(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHighlight = async (colorId) => {
    if (!activeSelection) {
      return;
    }

    const nextHighlight = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      pageIndex: activeSelection.pageIndex,
      colorId,
      text: activeSelection.text,
      rects: activeSelection.rects,
      createdAt: new Date().toISOString(),
    };

    await saveHighlights([...highlights, nextHighlight]);
    setIsEraserActive(false);
  };

  const handleRemoveHighlight = async (highlightId) => {
    await saveHighlights(highlights.filter((highlight) => highlight.id !== highlightId));
  };

  return (
    <div className="attachment-preview-shell pdf-attachment-viewer">
      <div className="attachment-preview-toolbar pdf-toolbar">
        <div className="attachment-preview-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="attachment-preview-meta pdf-toolbar-meta">
          <span className="attachment-preview-pill">{isSaving ? 'Saving highlights' : 'PDF highlight mode'}</span>
          <span className="attachment-preview-caption">
            Select text, choose a color, and it will persist in this PDF.
          </span>
        </div>
      </div>

      <div className="pdf-highlight-actions">
        <div className="pdf-color-row" role="toolbar" aria-label="Highlight colors">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={`pdf-color-swatch ${activeColorId === color.id ? 'active' : ''}`}
              style={{ '--swatch-color': color.hex }}
              onClick={() => {
                setActiveColorId(color.id);
                setIsEraserActive(false);
                if (activeSelection) {
                  handleAddHighlight(color.id);
                }
              }}
              disabled={isSaving}
              title={`Highlight in ${color.label}`}
            />
          ))}
        </div>

        <div className="pdf-action-group">
          <button
            type="button"
            className={`button ${isEraserActive ? 'pdf-tool-active' : ''}`}
            onClick={() => setIsEraserActive((currentValue) => !currentValue)}
            disabled={!highlights.length || isSaving}
          >
            {isEraserActive ? 'Eraser on' : 'Eraser'}
          </button>
          <a className="button" href={getAttachmentDownloadUrl(attachment.id)} download={attachment.fileName}>
            Download
          </a>
        </div>
      </div>

      <div className="pdf-page-nav">
        <button
          type="button"
          className="button"
          onClick={() => {
            window.getSelection()?.removeAllRanges();
            setActiveSelection(null);
            setCurrentPageIndex((pageIndex) => Math.max(0, pageIndex - 1));
          }}
          disabled={currentPageIndex === 0 || isRendering}
        >
          Previous
        </button>
        <span className="pdf-page-indicator">
          {totalPages ? `Page ${currentPageIndex + 1} of ${totalPages}` : 'No pages'}
        </span>
        <button
          type="button"
          className="button"
          onClick={() => {
            window.getSelection()?.removeAllRanges();
            setActiveSelection(null);
            setCurrentPageIndex((pageIndex) => Math.min(totalPages - 1, pageIndex + 1));
          }}
          disabled={!totalPages || currentPageIndex >= totalPages - 1 || isRendering}
        >
          Next
        </button>
      </div>

      <div ref={containerRef} className="attachment-preview-stage pdf-document-stage">
        {isRendering ? <p className="empty-state">Rendering PDF...</p> : null}

        {currentPage ? (
          <section
            key={currentPage.pageIndex}
            className="pdf-page"
            data-page-index={currentPage.pageIndex}
            style={{ width: currentPage.width, minHeight: currentPage.height }}
          >
            <img src={currentPage.image} alt="" className="pdf-page-image" draggable="false" />

            <div className="pdf-text-layer" aria-hidden="true">
              {currentPage.textItems.map((item, index) => (
                <span
                  key={`${currentPage.pageIndex}-${index}`}
                  className="pdf-text-span"
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    fontSize: item.fontSize,
                  }}
                >
                  {item.text}
                </span>
              ))}
            </div>

            <div className="pdf-highlight-layer" aria-hidden="true">
              {(groupedHighlights[currentPage.pageIndex] || []).map((highlight) => {
                const color = HIGHLIGHT_COLORS.find((item) => item.id === highlight.colorId) || HIGHLIGHT_COLORS[0];

                return (
                  <div key={highlight.id} className="pdf-highlight-group" title={highlight.text || color.label}>
                    {highlight.rects.map((rect, index) => (
                      <button
                        key={`${highlight.id}-${index}`}
                        type="button"
                        className={`pdf-highlight-rect ${isEraserActive ? 'eraser-active' : ''}`}
                        style={{
                          left: `${rect.x * 100}%`,
                          top: `${rect.y * 100}%`,
                          width: `${rect.width * 100}%`,
                          height: `${rect.height * 100}%`,
                          background: color.hex,
                        }}
                        onClick={() => {
                          if (isEraserActive) {
                            handleRemoveHighlight(highlight.id);
                          }
                        }}
                        title={isEraserActive ? 'Erase highlight' : 'Highlight'}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default PdfAttachmentViewer;
