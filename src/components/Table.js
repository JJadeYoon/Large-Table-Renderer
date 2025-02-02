import React, { useState, useEffect } from 'react';
import '../styles/Table.css';

function Table() {
  const rows = 10;
  const cols = 5;
  
  // 알파벳 열 헤더 생성 함수
  const getColumnLabel = (index) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[index];
  };
  
  // 편집 중인 셀의 위치를 저장
  const [editingCell, setEditingCell] = useState(null);
  const [tableData, setTableData] = useState({});  // 빈 객체로 초기화

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
  const evaluateFormula = (formula, data = tableData) => {
    try {
      // = 제거
      const expression = formula.substring(1).replace(/\s+/g, '');  // 모든 공백 제거
      
      console.log('Original expression:', expression);
      
      // $ 기호 제거 (절대 참조 처리)
      const expressionWithoutDollar = expression.replace(/\$/g, '');
      
      // 셀 참조를 값으로 변환 (예: A1 또는 A$1 -> 해당 셀의 값)
      const evaluatedExpression = expressionWithoutDollar.replace(/[A-Z]+\d+/g, (cellRef) => {
        const [row, col] = parseCellReference(cellRef);
        console.log('Cell reference:', cellRef, 'parsed to:', row, col);
        const value = Number(data[`${row}-${col}`]) || 0;
        console.log('Cell value:', value);
        return value;
      });
      
      console.log('Evaluated expression:', evaluatedExpression);
      
      // 계산 실행
      const result = eval(evaluatedExpression);
      console.log('Result:', result);
      return Number(result);
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '#ERROR!';
    }
  };

  // 초기 테스트 데이터 설정
  const setupTestData = () => {
    const newData = {};
    // A1에 초기값 설정
    newData['0-0'] = 1;  // A1 = 1
    newData['0-0_raw'] = '1';
    
    // B열 수식 설정 (B1부터 B{rows})
    for (let i = 0; i < rows; i++) {
      const formula = i === 0 ? '=A$1' : `=A$1+B${i}`;  // B{i+1} = A$1 + B{i}
      newData[`${i}-1_raw`] = formula;  // B{i+1}의 수식
      newData[`${i}-1`] = evaluateFormula(formula, newData);  // 현재까지의 newData를 사용하여 계산
    }
    
    setTableData(newData);
  };

  // 컴포넌트 마운트 시 테스트 데이터 설정
  useEffect(() => {
    setupTestData();
  }, []);

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