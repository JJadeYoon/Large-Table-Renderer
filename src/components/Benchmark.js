import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import { UniverSheetsPlugin } from '@univerjs/sheets';
import { Univer } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { IWorkbookData, ISheetData } from '@univerjs/core';
import Table from './Table';
import { collectMetrics, measureBatchOperation } from '../utils/benchmark';

const TEST_DATA_SIZE = 1000000;
const TEST_FORMULA = '=SUM(A1:A100)';

const createUniverInstance = () => {
  const univer = new Univer({
    theme: defaultTheme,
  });
  univer.registerPlugin(UniverSheetsPlugin);
  return univer;
};

const Benchmark = () => {
  const [results, setResults] = useState(null);

  const runBenchmarks = async () => {
    // 1. Test your implementation
    const myTableMetrics = await collectMetrics(Table, {
      render: () => new Promise(resolve => {
        const table = document.createElement('div');
        const root = createRoot(table);
        root.render(<Table />);
        document.body.appendChild(table);
        setTimeout(() => {
          root.unmount();
          document.body.removeChild(table);
          resolve();
        }, 1000);
      }),
      processFormula: (formula) => new Promise(resolve => {
        // Your formula processing logic
        resolve();
      }),
      scroll: () => new Promise(resolve => {
        const container = document.querySelector('.table-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
          setTimeout(resolve, 100);
        } else {
          resolve();
        }
      })
    });

    // 2. Test Fortune-sheet
    const fortuneSheetMetrics = await collectMetrics(Workbook, {
      render: () => new Promise(resolve => {
        const fortuneSheet = document.createElement('div');
        fortuneSheet.style.width = '100%';
        fortuneSheet.style.height = '600px';
        document.body.appendChild(fortuneSheet);
        
        const root = createRoot(fortuneSheet);
        root.render(
          <Workbook 
            data={[{ 
              name: "Sheet1",
              celldata: [],
              row: 100,
              column: 26
            }]}
            style={{
              height: '100%',
              width: '100%'
            }}
          />
        );
        
        setTimeout(() => {
          root.unmount();
          document.body.removeChild(fortuneSheet);
          resolve();
        }, 1000);
      }),
      processFormula: (formula) => new Promise(resolve => {
        const workbook = document.querySelector('.fortune-sheet-container');
        if (workbook) {
          // Formula processing using Fortune-sheet API
          resolve();
        } else {
          resolve();
        }
      }),
      scroll: () => new Promise(resolve => {
        const container = document.querySelector('.fortune-sheet-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
          setTimeout(resolve, 100);
        } else {
          resolve();
        }
      })
    });

    // 3. Test Univer
    const univerMetrics = await collectMetrics(UniverSheetsPlugin, {
      render: () => new Promise(resolve => {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '600px';
        document.body.appendChild(container);

        const univer = createUniverInstance();
        
        // Create workbook data
        const workbookData = {
          id: 'workbook-01',
          sheets: [{
            id: 'sheet-01',
            name: 'Sheet1',
            cellData: {
              0: {
                0: { v: 1 }, // A1
                1: { v: 2 }  // A2
              }
            }
          }]
        };

        // Initialize workbook
        univer.createUniverSheet(container, workbookData);
        
        setTimeout(() => {
          document.body.removeChild(container);
          resolve();
        }, 1000);
      }),
      processFormula: (formula) => new Promise(resolve => {
        try {
          const container = document.createElement('div');
          const univer = createUniverInstance();
          
          const workbookData = {
            id: 'workbook-02',
            sheets: [{
              id: 'sheet-02',
              name: 'Sheet1',
              cellData: {
                0: {
                  0: { v: 1 }, // A1
                  1: { v: 2 }  // A2
                },
                2: {
                  0: { f: formula } // A3
                }
              }
            }]
          };

          univer.createUniverSheet(container, workbookData);
          resolve();
        } catch (error) {
          console.error('Univer formula processing error:', error);
          resolve();
        }
      }),
      scroll: () => new Promise(resolve => {
        const container = document.querySelector('.univer-sheet-container, .univer-worksheet-view, .univer-sheet-view');
        if (container) {
          const scrollHeight = container.scrollHeight;
          container.scrollTop = scrollHeight;
          setTimeout(resolve, 100);
        } else {
          console.warn('Univer scroll container not found');
          resolve();
        }
      })
    });

    // Collect and format results
    setResults({
      myTable: {
        memoryUsage: myTableMetrics.memoryUsage?.usedJSHeapSize / 1024 / 1024 || 'N/A',
        domElements: myTableMetrics.domElements,
        renderTime: myTableMetrics.renderTime,
        formulaProcessingTime: myTableMetrics.formulaProcessingTime,
        scrollPerformance: myTableMetrics.scrollPerformance,
        fps: myTableMetrics.fps
      },
      fortuneSheet: {
        memoryUsage: fortuneSheetMetrics.memoryUsage?.usedJSHeapSize / 1024 / 1024 || 'N/A',
        domElements: fortuneSheetMetrics.domElements,
        renderTime: fortuneSheetMetrics.renderTime,
        formulaProcessingTime: fortuneSheetMetrics.formulaProcessingTime,
        scrollPerformance: fortuneSheetMetrics.scrollPerformance,
        fps: fortuneSheetMetrics.fps
      },
      univer: {
        memoryUsage: univerMetrics.memoryUsage?.usedJSHeapSize / 1024 / 1024 || 'N/A',
        domElements: univerMetrics.domElements,
        renderTime: univerMetrics.renderTime,
        formulaProcessingTime: univerMetrics.formulaProcessingTime,
        scrollPerformance: univerMetrics.scrollPerformance,
        fps: univerMetrics.fps
      }
    });
  };

  useEffect(() => {
    runBenchmarks();
  }, []);

  if (!results) {
    return <div>벤치마크 실행 중...</div>;
  }

  return (
    <div className="benchmark-results">
      <h2>벤치마크 결과</h2>
      <table>
        <thead>
          <tr>
            <th>메트릭</th>
            <th>MyTable</th>
            <th>Fortune-sheet</th>
            <th>Univer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>메모리 사용량 (MB)</td>
            <td>{results.myTable.memoryUsage.toFixed(2)}</td>
            <td>{results.fortuneSheet.memoryUsage.toFixed(2)}</td>
            <td>{results.univer.memoryUsage.toFixed(2)}</td>
          </tr>
          <tr>
            <td>DOM 요소 수</td>
            <td>{results.myTable.domElements}</td>
            <td>{results.fortuneSheet.domElements}</td>
            <td>{results.univer.domElements}</td>
          </tr>
          <tr>
            <td>렌더링 시간 (ms)</td>
            <td>{results.myTable.renderTime.toFixed(2)}</td>
            <td>{results.fortuneSheet.renderTime.toFixed(2)}</td>
            <td>{results.univer.renderTime.toFixed(2)}</td>
          </tr>
          <tr>
            <td>수식 처리 시간 (ms)</td>
            <td>{results.myTable.formulaProcessingTime.toFixed(2)}</td>
            <td>{results.fortuneSheet.formulaProcessingTime.toFixed(2)}</td>
            <td>{results.univer.formulaProcessingTime.toFixed(2)}</td>
          </tr>
          <tr>
            <td>스크롤 성능 (ms)</td>
            <td>{results.myTable.scrollPerformance.toFixed(2)}</td>
            <td>{results.fortuneSheet.scrollPerformance.toFixed(2)}</td>
            <td>{results.univer.scrollPerformance.toFixed(2)}</td>
          </tr>
          <tr>
            <td>FPS</td>
            <td>{results.myTable.fps.toFixed(1)}</td>
            <td>{results.fortuneSheet.fps.toFixed(1)}</td>
            <td>{results.univer.fps.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Benchmark; 