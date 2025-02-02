import React, { useState } from 'react';
import '../styles/Table.css';

function Table() {
  // 테스트를 위한 간단한 데이터
  const rows = 10;
  const cols = 5;
  
  // 알파벳 열 헤더 생성 함수
  const getColumnLabel = (index) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[index];
  };
  
  // 테이블 데이터를 상태로 관리
  const [tableData, setTableData] = useState(() => {
    return {};
  });

  // 편집 중인 셀의 위치를 저장
  const [editingCell, setEditingCell] = useState(null);

  const handleDoubleClick = (rowIndex, colIndex) => {
    setEditingCell(`${rowIndex}-${colIndex}`);
  };

  // 셀 참조 변환 함수 (예: A1 -> [0,0])
  const parseCellReference = (ref) => {
    const column = ref.match(/[A-Z]+/)[0];
    const row = parseInt(ref.match(/\d+/)[0]) - 1;
    const col = column.split('').reduce((acc, char) => 
      acc * 26 + char.charCodeAt(0) - 'A'.charCodeAt(0), 0
    );
    return [row, col];
  };

  // 수식 계산 함수
  const evaluateFormula = (formula) => {
    try {
      // = 제거
      const expression = formula.substring(1);
      
      console.log('Original expression:', expression);
      
      // 셀 참조를 값으로 변환 (예: A1 -> 해당 셀의 값)
      const evaluatedExpression = expression.replace(/[A-Z]+\d+/g, (cellRef) => {
        const [row, col] = parseCellReference(cellRef);
        console.log('Cell reference:', cellRef, 'parsed to:', row, col);
        const value = tableData[`${row}-${col}`] || '0';
        console.log('Cell value:', value);
        return isNaN(value) ? '0' : value;
      });
      
      console.log('Evaluated expression:', evaluatedExpression);
      
      // 계산 실행
      const result = eval(evaluatedExpression);
      console.log('Result:', result);
      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '#ERROR!';
    }
  };

  const handleChange = (e, rowIndex, colIndex) => {
    const newValue = e.target.value;
    console.log('New value:', newValue);
    
    // 수식인 경우 계산 결과를 저장
    const finalValue = newValue.startsWith('=') 
      ? evaluateFormula(newValue)
      : newValue;
    
    console.log('Final value:', finalValue);
    
    setTableData(prev => ({
      ...prev,
      [`${rowIndex}-${colIndex}`]: finalValue,
      [`${rowIndex}-${colIndex}_raw`]: newValue // 원본 수식 저장
    }));
  };

  // 셀 표시 값 가져오기
  const getCellDisplayValue = (cellId) => {
    const rawValue = tableData[`${cellId}_raw`] || '';
    if (rawValue.startsWith('=')) {
      return evaluateFormula(rawValue);
    }
    return tableData[cellId] || '';
  };

  const handleBlur = () => {
    setEditingCell(null);
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th className="row-header">Row</th>
            {Array(cols).fill().map((_, colIndex) => (
              <th key={colIndex}>
                {getColumnLabel(colIndex)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array(rows).fill().map((_, rowIndex) => (
            <tr key={rowIndex}>
              <td className="row-header">{rowIndex + 1}</td>
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
                        value={tableData[`${cellId}_raw`] || tableData[cellId] || ''}
                        onChange={(e) => handleChange(e, rowIndex, colIndex)}
                        onBlur={handleBlur}
                        autoFocus
                      />
                    ) : (
                      getCellDisplayValue(cellId)
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