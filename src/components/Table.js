import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import '../styles/Table.css';
import Cell from './Cell';

function Table() {
  const rows = 100000;
  const cols = 3;
  const rowHeight = 35;  // 행 높이
  const viewportHeight = window.innerHeight - 100;  // 화면 높이에서 여백 제외
  
  // 스크롤 위치 상태 관리
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  
  // 현재 보여질 행 범위 계산
  const getVisibleRange = useCallback(() => {
    const start = Math.floor(scrollTop / rowHeight);
    const visibleRows = Math.ceil(viewportHeight / rowHeight);
    const end = Math.min(start + visibleRows + 10, rows); // 버퍼 증가
    return { start, end };
  }, [scrollTop]);
  
  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  // 알파벳 열 헤더 생성 함수
  const getColumnLabel = (index) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[index];
  };
  
  // 편집 중인 셀의 위치를 저장
  const [editingCell, setEditingCell] = useState(null);
  const [tableData, setTableData] = useState({});  // 빈 객체로 초기화

  // 셀 의존성 그래프 저장
  const [dependencyGraph, setDependencyGraph] = useState({});
  
  // 계산 결과 캐시
  const [calculationCache, setCalculationCache] = useState({});

  // 초기 데이터 로딩 상태
  const [isLoading, setIsLoading] = useState(true);

  // 초기 데이터 설정 함수
  const setupTestData = () => {
    const newData = {};
    // A1에 초기값 설정
    newData['0-0'] = 1;
    newData['0-0_raw'] = '1';
    
    // 배치 크기 설정
    const batchSize = 1000;
    let processed = 0;
    
    const processNextBatch = () => {
      const end = Math.min(processed + batchSize, rows);
      
      for (let i = processed; i < end; i++) {
        const formula = i === 0 ? '=A$1' : `=A$1+B${i}`;
        newData[`${i}-1_raw`] = formula;
        if (i === 0) {
          newData[`${i}-1`] = 1;  // B1 = A1 = 1
        } else {
          const prevValue = Number(newData[`${i-1}-1`]) || 0;
          newData[`${i}-1`] = 1 + prevValue;  // B{i+1} = A1 + B{i}
        }
      }
      
      setTableData(prev => ({...prev, ...newData}));
      processed = end;
      
      if (processed < rows) {
        setTimeout(processNextBatch, 0);
      } else {
        setIsLoading(false);
      }
    };
    
    processNextBatch();
  };

  // 1. 기본 유틸리티 함수들 먼저 선언
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

  // 2. 데이터 관련 기본 함수들
  const getCellValue = useCallback((cellId) => {
    return tableData[cellId] || '';
  }, [tableData]);
  
  const getCellRawValue = useCallback((cellId) => {
    return tableData[`${cellId}_raw`] || tableData[cellId] || '';
  }, [tableData]);

  // 3. 의존성 그래프 관련 함수
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

  // 4. 수식 계산 관련 함수들
  const evaluateFormula = useCallback((formula, data = tableData) => {
    try {
      const cacheKey = `${formula}_${JSON.stringify(data)}`;
      if (calculationCache[cacheKey] !== undefined) {
        return calculationCache[cacheKey];
      }
      
      const expression = formula.substring(1).replace(/\s+/g, '');
      const expressionWithoutDollar = expression.replace(/\$/g, '');
      
      const dependencies = new Set();
      
      const evaluatedExpression = expressionWithoutDollar.replace(/[A-Z]+\d+/g, (cellRef) => {
        const [row, col] = parseCellReference(cellRef);
        const cellId = `${row}-${col}`;
        dependencies.add(cellId);
        const value = Number(data[`${row}-${col}`]) || 0;
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
  }, [calculationCache, updateDependencyGraph, tableData]);

  // 5. 셀 표시 값 가져오기 (evaluateFormula 의존)
  const getCellDisplayValue = useCallback((cellId) => {
    const rawValue = tableData[`${cellId}_raw`] || '';
    if (rawValue.startsWith('=')) {
      return evaluateFormula(rawValue);
    }
    return tableData[cellId] || '';
  }, [tableData, evaluateFormula]);

  // 6. 재계산 함수
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

  // 7. 이벤트 핸들러들
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

  // 8. 렌더링 관련 함수들
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
          {Array(rows).fill().map((_, rowIndex) => {
            const { start, end } = memoizedVisibleRange;
            if (rowIndex < start || rowIndex > end) return null;
            return renderRow(rowIndex);
          })}
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

export default Table; 