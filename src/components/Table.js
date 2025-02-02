import React, { useState } from 'react';
import '../styles/Table.css';

function Table() {
  // 테스트를 위한 간단한 데이터
  const rows = 10;
  const cols = 5;
  
  // 테이블 데이터를 상태로 관리
  const [tableData, setTableData] = useState(() => {
    const data = {};
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        data[`${i}-${j}`] = `${i}-${j}`;
      }
    }
    return data;
  });

  // 편집 중인 셀의 위치를 저장
  const [editingCell, setEditingCell] = useState(null);

  const handleDoubleClick = (rowIndex, colIndex) => {
    setEditingCell(`${rowIndex}-${colIndex}`);
  };

  const handleChange = (e, rowIndex, colIndex) => {
    const newValue = e.target.value;
    setTableData(prev => ({
      ...prev,
      [`${rowIndex}-${colIndex}`]: newValue
    }));
  };

  const handleBlur = () => {
    setEditingCell(null);
  };

  return (
    <div className="table-container">
      <table>
        <tbody>
          {Array(rows).fill().map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array(cols).fill().map((_, colIndex) => {
                const cellId = `${rowIndex}-${colIndex}`;
                const isEditing = editingCell === cellId;

                return (
                  <td 
                    key={colIndex}
                    onDoubleClick={() => handleDoubleClick(rowIndex, colIndex)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={tableData[cellId]}
                        onChange={(e) => handleChange(e, rowIndex, colIndex)}
                        onBlur={handleBlur}
                        autoFocus
                      />
                    ) : (
                      tableData[cellId]
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table; 