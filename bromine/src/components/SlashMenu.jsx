import React, { forwardRef, useImperativeHandle, useState } from 'react';
import './SlashMenu.css';

const SlashMenu = forwardRef(function SlashMenu(props, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemCount = props.items.length;
  const currentIndex = props.items[selectedIndex] ? selectedIndex : 0;

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!itemCount) {
        return false;
      }

      if (event.key === 'ArrowUp') {
        setSelectedIndex((currentIndex + itemCount - 1) % itemCount);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((currentIndex + 1) % itemCount);
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(currentIndex);
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="slash-menu">
      {itemCount ? (
        props.items.map((item, index) => (
          <button
            key={`${item.title}-${index}`}
            className={`slash-item ${index === currentIndex ? 'is-selected' : ''}`}
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

export default SlashMenu;
