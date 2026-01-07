import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import './SlashMenu.css'; // We will add styles later

export default forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="slash-menu">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            key={index}
            className={`slash-item ${index === selectedIndex ? 'is-selected' : ''}`}
            onClick={() => selectItem(index)}
          >
            {item.element}
          </button>
        ))
      ) : (
        <div className="slash-empty">No results</div>
      )}
    </div>
  );
});