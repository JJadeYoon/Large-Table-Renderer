import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import '../styles/Table.css';
import Cell from './Cell';

function Table() {
  // 1. 상수 선언
  const rows = 1000000;
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
  
  // 계산 큐 관리를 위한 ref 추가
  const calculationQueue = useRef([]);
  const isCalculating = useRef(false);
  const lastVisibleRange = useRef({ start: 0, end: 0 });
  
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

  // 6. 의존성 그래프 관련 함수 수정
  const updateDependencyGraph = useCallback((dependencies, targetCellId) => {
    setDependencyGraph(prev => {
      const newGraph = {...prev};
      dependencies.forEach(dep => {
        if (!newGraph[dep]) {
          newGraph[dep] = new Set();
        }
        newGraph[dep].add(targetCellId);
      });
      return newGraph;
    });
  }, []);

  // 7. 수식 계산 관련 함수들 수정
  const createCacheKey = useCallback((formula, relevantData) => {
    return `${formula}_${Object.values(relevantData).join('_')}`;
  }, []);

  const evaluateFormula = useCallback((formula, cellId, data = tableData) => {
    try {
      const dependencies = new Set();
      const relevantData = {};
      
      // 수식에서 셀 참조 찾기
      formula.replace(/[A-Z]+\d+/g, (cellRef) => {
        const [row, col] = parseCellReference(cellRef);
        const depCellId = `${row}-${col}`;
        dependencies.add(depCellId);
        relevantData[depCellId] = data[depCellId];
      });

      const cacheKey = createCacheKey(formula, relevantData);
      if (calculationCache[cacheKey] !== undefined) {
        return { result: calculationCache[cacheKey], dependencies };
      }
      
      const expression = formula.substring(1).replace(/\s+/g, '');
      const expressionWithoutDollar = expression.replace(/\$/g, '');
      
      // 수식 내의 각 셀 참조를 실제 값으로 대체
      const evaluatedExpression = expressionWithoutDollar.replace(/[A-Z]+\d+/g, (cellRef) => {
        const [row, col] = parseCellReference(cellRef);
        const depCellId = `${row}-${col}`;
        dependencies.add(depCellId);
        
        const rawValue = data[`${depCellId}_raw`] || '';
        const value = rawValue.startsWith('=') 
          ? evaluateFormula(rawValue, depCellId, data).result
          : Number(data[depCellId]) || 0;
          
        return value;
      });
      
      const result = calculateExpression(evaluatedExpression);
      
      setCalculationCache(prev => ({
        ...prev,
        [cacheKey]: result
      }));
      
      if (cellId) {
        updateDependencyGraph(Array.from(dependencies), cellId);
      }
      
      return { result: Number(result), dependencies };
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return { result: '#ERROR!', dependencies: new Set() };
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
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    
    const { start, end } = getVisibleRange();
    
    const newData = {...tableData};
    const newDependencyGraph = {...dependencyGraph};
    let hasChanges = false;
    
    for (let i = Math.max(0, start); i <= end; i++) {
      const cellId = `${i}-1`;  // B열
      if (!tableData[cellId]) {
        const formula = i === 0 ? '=A$1' : `=A$1+B${i}`;
        newData[`${cellId}_raw`] = formula;
        
        // 의존성 설정
        if (!newDependencyGraph['0-0']) {
          newDependencyGraph['0-0'] = new Set();
        }
        newDependencyGraph['0-0'].add(cellId);
        
        if (i > 0) {
          const prevCellId = `${i-1}-1`;
          if (!newDependencyGraph[prevCellId]) {
            newDependencyGraph[prevCellId] = new Set();
          }
          newDependencyGraph[prevCellId].add(cellId);
        }
        
        // 값 계산
        if (i === 0) {
          newData[cellId] = Number(newData['0-0']);
          hasChanges = true;
        } else if (newData[`${i-1}-1`] !== undefined) {
          newData[cellId] = Number(newData['0-0']) + Number(newData[`${i-1}-1`]);
          hasChanges = true;
        }
      }
    }
    
    if (hasChanges) {
      setTableData(newData);
      setDependencyGraph(newDependencyGraph);
    }
  }, [getVisibleRange, tableData, dependencyGraph]);

  // 알파벳 열 헤더 생성 함수 수정
  const getColumnLabel = (index) => {
    let label = '';
    let num = index;
    
    while (num >= 0) {
      label = String.fromCharCode('A'.charCodeAt(0) + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    
    return label;
  };
  
  // 초기 데이터 설정 함수
  const setupTestData = () => {
    const newData = {};
    const newDependencyGraph = {};
    
    // A1 값 설정
    newData['0-0'] = 1;
    newData['0-0_raw'] = '1';
    
    // 처음 화면에 보이는 부분의 수식과 값을 미리 계산
    const visibleRows = Math.ceil(viewportHeight / rowHeight) + 20;
    
    // B1 값을 먼저 설정 (A1 참조)
    const b1Formula = '=A$1';
    newData['0-1'] = 1;  // A1의 값
    newData['0-1_raw'] = b1Formula;
    
    // C1 값 설정 (A1 + B1 * B2)
    const c1Formula = '=A1+B1*B2';
    newData['0-2_raw'] = c1Formula;
    
    // B1의 의존성 설정 (A1에 의존)
    if (!newDependencyGraph['0-0']) {
      newDependencyGraph['0-0'] = new Set();
    }
    newDependencyGraph['0-0'].add('0-1');
    
    // C1의 의존성 설정 (A1, B1, B2에 의존)
    newDependencyGraph['0-0'].add('0-2');  // A1 의존성
    if (!newDependencyGraph['0-1']) {
      newDependencyGraph['0-1'] = new Set();
    }
    newDependencyGraph['0-1'].add('0-2');  // B1 의존성
    if (!newDependencyGraph['1-1']) {
      newDependencyGraph['1-1'] = new Set();
    }
    newDependencyGraph['1-1'].add('0-2');  // B2 의존성
    
    // B2부터 순차적으로 계산
    for (let i = 1; i < visibleRows; i++) {
      const formula = `=A$1+B${i}`;
      const cellId = `${i}-1`;
      newData[`${cellId}_raw`] = formula;
      
      // 이전 B열 값 + A1 값
      const prevBValue = newData[`${i-1}-1`];
      newData[cellId] = prevBValue + newData['0-0'];
      
      // 의존성 설정
      // A1에 대한 의존성
      if (!newDependencyGraph['0-0']) {
        newDependencyGraph['0-0'] = new Set();
      }
      newDependencyGraph['0-0'].add(cellId);
      
      // 이전 B열 셀에 대한 의존성
      const prevCellId = `${i-1}-1`;
      if (!newDependencyGraph[prevCellId]) {
        newDependencyGraph[prevCellId] = new Set();
      }
      newDependencyGraph[prevCellId].add(cellId);
    }
    
    // C1 값 계산
    const { result } = evaluateFormula(c1Formula, '0-2', newData);
    newData['0-2'] = result;
    
    setTableData(newData);
    setDependencyGraph(newDependencyGraph);
    setIsLoading(false);
  };

  // 9. 셀 표시 값 가져오기 (evaluateFormula 의존)
  const getCellDisplayValue = useCallback((cellId) => {
    const rawValue = tableData[`${cellId}_raw`] || '';
    const value = tableData[cellId];
    
    // 수식이 있고 값이 아직 없는 경우
    if (rawValue.startsWith('=') && value === undefined) {
        return '...';
    }
    
    return value || '';
  }, [tableData]);

  // 10. 재계산 함수 수정
  const recalculateDependents = useCallback((changedCellId) => {
    const processed = new Set();
    const queue = [...(dependencyGraph[changedCellId] || [])];
    
    while (queue.length > 0) {
      const cellId = queue.shift();
      if (processed.has(cellId)) continue;
      processed.add(cellId);
      
      const formula = tableData[`${cellId}_raw`];
      if (formula && formula.startsWith('=')) {
        const { result } = evaluateFormula(formula, cellId);
        setTableData(prev => ({
          ...prev,
          [cellId]: result
        }));
        
        // 현재 셀에 의존하는 다른 셀들을 큐에 추가
        const nextDependents = dependencyGraph[cellId] || [];
        queue.push(...nextDependents);
      }
    }
  }, [dependencyGraph, tableData, evaluateFormula]);

  // 11. 이벤트 핸들러들 수정
  const handleCellDoubleClick = useCallback((rowIndex, colIndex) => {
    setEditingCell(`${rowIndex}-${colIndex}`);
  }, []);

  const handleCellChange = useCallback((e, rowIndex, colIndex) => {
    const newValue = e.target.value;
    const cellId = `${rowIndex}-${colIndex}`;
    
    // 먼저 모든 의존성 관계를 찾기 위해 전체 tableData를 검사
    const allDependents = new Set();
    const findAllDependents = (id) => {
      const deps = dependencyGraph[id];
      if (!deps) return;
      
      deps.forEach(depId => {
        if (!allDependents.has(depId)) {
          allDependents.add(depId);
          findAllDependents(depId);
        }
      });
    };
    findAllDependents(cellId);
    
    // 모든 업데이트를 하나의 배치로 처리
    const batchUpdate = () => {
      const newData = { ...tableData };
      
      // 1. 현재 셀 값 업데이트
      newData[`${cellId}_raw`] = newValue;
      if (newValue.startsWith('=')) {
        const { result } = evaluateFormula(newValue, cellId, newData);
        newData[cellId] = result;
      } else {
        newData[cellId] = isNaN(Number(newValue)) ? newValue : Number(newValue);
      }
      
      // 2. 모든 의존성이 있는 셀들의 수식 재평가
      const evaluated = new Set();
      const toEvaluate = Array.from(allDependents);
      
      while (toEvaluate.length > 0) {
        const currentId = toEvaluate[0];
        const formula = newData[`${currentId}_raw`] || '';
        
        if (formula.startsWith('=') && !evaluated.has(currentId)) {
          const { result } = evaluateFormula(formula, currentId, newData);
          newData[currentId] = Number(result);
          evaluated.add(currentId);
        }
        
        toEvaluate.shift();
      }
      
      // 3. 한 번에 모든 업데이트 적용
      setTableData(newData);
      setCalculationCache({});
    };

    // React의 다음 틱에서 실행하여 상태 업데이트를 보장
    requestAnimationFrame(batchUpdate);
  }, [evaluateFormula, dependencyGraph, tableData]);

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