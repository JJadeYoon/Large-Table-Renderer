import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import '../styles/Table.css';
import Cell from './Cell';

function Table() {
  // 1. 상수 선언
  const rows = 10000;
  const cols = 3;
  const rowHeight = 35;  // 행 높이
  const viewportHeight = window.innerHeight - 100;  // 화면 높이에서 여백 제외
  
  // 2. 상태 선언
  const [scrollTop, setScrollTop] = useState(0);
  const [editingCell, setEditingCell] = useState(null);
  const [tableData, setTableData] = useState({});
  const [dependencyGraph, setDependencyGraph] = useState({});
  const [calculationCache, setCalculationCache] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // 3. ref 선언
  const containerRef = useRef(null);
  
  // 4. 기본 유틸리티 함수들
  const calculateExpression = (expression) => {
    if (!/^[0-9+\-*/\s.()]+$/.test(expression)) {
      throw new Error('Invalid expression');
    }
    return new Function(`return ${expression}`)();
  };

  const parseCellReference = (ref) => {
    const column = ref.match(/[A-Z]+/)[0];
    const row = parseInt(ref.match(/\d+/)[0]) - 1;
    const col = column.split('').reduce((acc, char) => 
      acc * 26 + char.charCodeAt(0) - 'A'.charCodeAt(0), 0
    );
    return [row, col];
  };

  // 5. 데이터 관련 기본 함수들
  const getCellValue = useCallback((cellId) => {
    return tableData[cellId] || '';
  }, [tableData]);
  
  const getCellRawValue = useCallback((cellId) => {
    return tableData[`${cellId}_raw`] || tableData[cellId] || '';
  }, [tableData]);

  // 6. 의존성 그래프 관련 함수
  const updateDependencyGraph = useCallback((dependencies, formula) => {
    setDependencyGraph(prev => {
      const newGraph = {...prev};
      dependencies.forEach(dep => {
        if (!newGraph[dep]) {
          newGraph[dep] = new Set();
        }
        newGraph[dep].add(formula);
      });
      return newGraph;
    });
  }, []);

  // 7. 수식 계산 관련 함수들
  const createCacheKey = useCallback((formula, relevantData) => {
    return `${formula}_${Object.values(relevantData).join('_')}`;
  }, []);

  const evaluateFormula = useCallback((formula, data = tableData) => {
    try {
      const dependencies = new Set();
      const relevantData = {};
      
      // 수식에서 셀 참조 찾기
      formula.replace(/[A-Z]+\d+/g, (cellRef) => {
        const [row, col] = parseCellReference(cellRef);
        const cellId = `${row}-${col}`;
        dependencies.add(cellId);
        relevantData[cellId] = data[cellId];
      });

      const cacheKey = createCacheKey(formula, relevantData);
      if (calculationCache[cacheKey] !== undefined) {
        return calculationCache[cacheKey];
      }
      
      const expression = formula.substring(1).replace(/\s+/g, '');
      const expressionWithoutDollar = expression.replace(/\$/g, '');
      
      // 수식 내의 각 셀 참조를 실제 값으로 대체
      const evaluatedExpression = expressionWithoutDollar.replace(/[A-Z]+\d+/g, (cellRef) => {
        const [row, col] = parseCellReference(cellRef);
        const cellId = `${row}-${col}`;
        dependencies.add(cellId);
        
        // 참조된 셀이 수식을 가지고 있다면 먼저 그 수식을 계산
        const rawValue = data[`${cellId}_raw`] || '';
        const value = rawValue.startsWith('=') 
          ? evaluateFormula(rawValue, data)
          : Number(data[cellId]) || 0;
          
        return value;
      });
      
      const result = calculateExpression(evaluatedExpression);
      
      setCalculationCache(prev => ({
        ...prev,
        [cacheKey]: result
      }));
      
      updateDependencyGraph(Array.from(dependencies), formula);
      
      return Number(result);
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '#ERROR!';
    }
  }, [calculationCache, updateDependencyGraph, tableData, createCacheKey]);

  // 8. 화면 관련 함수들
  const getVisibleRange = useCallback(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
    const visibleRows = Math.ceil(viewportHeight / rowHeight);
    const end = Math.min(start + visibleRows + 15, rows);
    return { start, end };
  }, [scrollTop]);

  const handleScroll = useCallback((e) => {
    requestAnimationFrame(() => {
      const newScrollTop = e.target.scrollTop;
      setScrollTop(newScrollTop);
      
      // 새로 보이는 행들의 데이터 계산
      const { start, end } = getVisibleRange();
      const newData = {};
      
      for (let i = start; i <= end; i++) {
        const cellId = `${i}-1`;
        if (!tableData[cellId]) {
          const formula = i === 0 ? '=A$1' : `=A$1+B${i}`;
          newData[`${cellId}_raw`] = formula;
          newData[cellId] = evaluateFormula(formula);
        }
      }
      
      if (Object.keys(newData).length > 0) {
        setTableData(prev => ({...prev, ...newData}));
      }
    });
  }, [getVisibleRange, tableData, evaluateFormula]);
  
  // 알파벳 열 헤더 생성 함수
  const getColumnLabel = (index) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[index];
  };
  
  // 초기 데이터 설정 함수
  const setupTestData = () => {
    const newData = {};
    
    // A1 값 설정
    newData['0-0'] = 1;
    newData['0-0_raw'] = '1';
    
    // 처음 화면에 보이는 부분의 수식과 값을 미리 계산
    const visibleRows = Math.ceil(viewportHeight / rowHeight) + 20;
    
    // B1 값을 먼저 설정 (A1 참조)
    newData['0-1'] = 1;  // A1의 값
    newData['0-1_raw'] = '=A$1';
    
    // B2부터 순차적으로 계산
    for (let i = 1; i < visibleRows; i++) {
        const formula = `=A$1+B${i}`;
        const cellId = `${i}-1`;
        newData[`${cellId}_raw`] = formula;
        
        // 이전 B열 값 + A1 값
        const prevBValue = newData[`${i-1}-1`];
        newData[cellId] = prevBValue + newData['0-0'];
    }
    
    setTableData(newData);
    setIsLoading(false);
  };

  // 9. 셀 표시 값 가져오기 (evaluateFormula 의존)
  const getCellDisplayValue = useCallback((cellId) => {
    const rawValue = tableData[`${cellId}_raw`] || '';
    
    // 수식이 있는 경우 항상 evaluateFormula 사용
    if (rawValue.startsWith('=')) {
        return evaluateFormula(rawValue);
    }
    
    // 수식이 없는 경우 저장된 값 반환
    return tableData[cellId] || '';
  }, [tableData, evaluateFormula]);

  // 10. 재계산 함수
  const recalculateDependents = useCallback((changedCellId) => {
    const dependents = dependencyGraph[changedCellId] || [];
    const processed = new Set();
    
    const recalculate = (cellId) => {
      if (processed.has(cellId)) return;
      processed.add(cellId);
      
      const formula = tableData[`${cellId}_raw`];
      if (formula && formula.startsWith('=')) {
        const newValue = evaluateFormula(formula);
        setTableData(prev => ({
          ...prev,
          [cellId]: newValue
        }));
        
        (dependencyGraph[cellId] || []).forEach(recalculate);
      }
    };
    
    dependents.forEach(recalculate);
  }, [dependencyGraph, tableData, evaluateFormula]);

  // 11. 이벤트 핸들러들
  const handleCellDoubleClick = useCallback((rowIndex, colIndex) => {
    setEditingCell(`${rowIndex}-${colIndex}`);
  }, []);

  const handleCellChange = useCallback((e, rowIndex, colIndex) => {
    const newValue = e.target.value;
    const cellId = `${rowIndex}-${colIndex}`;
    
    const finalValue = newValue.startsWith('=') 
      ? evaluateFormula(newValue)
      : newValue;
    
    setTableData(prev => ({
      ...prev,
      [cellId]: finalValue,
      [`${cellId}_raw`]: newValue
    }));
    
    setCalculationCache({});
    recalculateDependents(cellId);
  }, [evaluateFormula, recalculateDependents]);

  const handleBlur = useCallback(() => {
    setEditingCell(null);
  }, []);

  // 12. 렌더링 관련 함수들
  const renderRow = useCallback((rowIndex) => {
    return (
      <tr key={rowIndex}>
        <td className="row-header">{rowIndex + 1}</td>
        {Array(cols).fill().map((_, colIndex) => {
          const cellId = `${rowIndex}-${colIndex}`;
          const isEditing = editingCell === cellId;
          
          return (
            <Cell
              key={colIndex}
              rowIndex={rowIndex}
              colIndex={colIndex}
              isEditing={isEditing}
              value={getCellDisplayValue(cellId)}
              rawValue={tableData[`${cellId}_raw`] || tableData[cellId] || ''}
              onDoubleClick={handleCellDoubleClick}
              onChange={handleCellChange}
              onBlur={handleBlur}
            />
          );
        })}
      </tr>
    );
  }, [cols, editingCell, tableData, getCellDisplayValue, handleCellDoubleClick, handleCellChange, handleBlur]);

  // 캐시 최적화
  const memoizedVisibleRange = useMemo(() => getVisibleRange(), [scrollTop]);

  // 컴포넌트 마운트 시 테스트 데이터 설정
  useEffect(() => {
    setupTestData();
  }, []);  // 빈 의존성 배열

  // 행 렌더링 최적화
  const renderRows = useMemo(() => {
    const { start, end } = getVisibleRange();
    const rows = [];
    
    for (let rowIndex = start; rowIndex <= end; rowIndex++) {
      rows.push(renderRow(rowIndex));
    }
    
    return rows;
  }, [getVisibleRange, renderRow]);

  return (
    <div 
      className="table-container" 
      ref={containerRef}
      onScroll={handleScroll}
      style={{ 
        height: viewportHeight,
        overflow: 'auto',
        position: 'relative'
      }}
    >
      {isLoading ? (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          fontSize: '16px' 
        }}>
          Loading...
        </div>
      ) : (
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
            <tr>
              <td colSpan={cols + 1} style={{ height: scrollTop, padding: 0 }} />
            </tr>
            {renderRows}
            <tr>
              <td colSpan={cols + 1} style={{ 
                height: (rows - getVisibleRange().end) * rowHeight,
                padding: 0 
              }} />
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

export default React.memo(Table); 