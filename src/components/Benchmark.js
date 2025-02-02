import React, { useEffect, useState } from 'react';
import { Workbook } from '@fortune-sheet/react';
import { UniverSheet } from '@univerjs/sheets';
import Table from './Table';
import { collectMetrics, measureBatchOperation } from '../utils/benchmark';

const TEST_DATA_SIZE = 1000000;
const TEST_FORMULA = '=SUM(A1:A100)';

const Benchmark = () => {
  const [results, setResults] = useState(null);

  const runBenchmarks = async () => {
    // 1. Test your implementation
    const myTableMetrics = await collectMetrics(Table, {
      render: () => new Promise(resolve => {
        const table = document.createElement('div');
        table.innerHTML = '<Table />';
        document.body.appendChild(table);
        setTimeout(() => {
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
        fortuneSheet.innerHTML = '<Workbook />';
        document.body.appendChild(fortuneSheet);
        setTimeout(() => {
          document.body.removeChild(fortuneSheet);
          resolve();
        }, 1000);
      }),
      processFormula: (formula) => new Promise(resolve => {
        // Fortune-sheet formula processing
        resolve();
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
    const univerMetrics = await collectMetrics(UniverSheet, {
      render: () => new Promise(resolve => {
        const univer = document.createElement('div');
        univer.innerHTML = '<UniverSheet />';
        document.body.appendChild(univer);
        setTimeout(() => {
          document.body.removeChild(univer);
          resolve();
        }, 1000);
      }),
      processFormula: (formula) => new Promise(resolve => {
        // Univer formula processing
        resolve();
      }),
      scroll: () => new Promise(resolve => {
        const container = document.querySelector('.univer-sheet-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
          setTimeout(resolve, 100);
        } else {
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
    return <div>Running benchmarks...</div>;
  }

  return (
    <div className="benchmark-results">
      <h2>Benchmark Results</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>MyTable</th>
            <th>Fortune-sheet</th>
            <th>Univer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Memory Usage (MB)</td>
            <td>{results.myTable.memoryUsage.toFixed(2)}</td>
            <td>{results.fortuneSheet.memoryUsage.toFixed(2)}</td>
            <td>{results.univer.memoryUsage.toFixed(2)}</td>
          </tr>
          <tr>
            <td>DOM Elements</td>
            <td>{results.myTable.domElements}</td>
            <td>{results.fortuneSheet.domElements}</td>
            <td>{results.univer.domElements}</td>
          </tr>
          <tr>
            <td>Render Time (ms)</td>
            <td>{results.myTable.renderTime.toFixed(2)}</td>
            <td>{results.fortuneSheet.renderTime.toFixed(2)}</td>
            <td>{results.univer.renderTime.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Formula Processing (ms)</td>
            <td>{results.myTable.formulaProcessingTime.toFixed(2)}</td>
            <td>{results.fortuneSheet.formulaProcessingTime.toFixed(2)}</td>
            <td>{results.univer.formulaProcessingTime.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Scroll Performance (ms)</td>
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