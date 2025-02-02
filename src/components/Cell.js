import React, { memo } from 'react';

const Cell = memo(({ 
  rowIndex, 
  colIndex, 
  isEditing, 
  value, 
  rawValue, 
  onDoubleClick, 
  onChange, 
  onBlur 
}) => {
  return (
    <td onDoubleClick={() => onDoubleClick(rowIndex, colIndex)}>
      {isEditing ? (
        <input
          type="text"
          value={rawValue}
          onChange={(e) => onChange(e, rowIndex, colIndex)}
          onBlur={onBlur}
          autoFocus
        />
      ) : (
        value
      )}
    </td>
  );
});

export default Cell; 