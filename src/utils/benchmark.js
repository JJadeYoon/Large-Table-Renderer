import now from 'performance-now';

// Memory usage measurement
export const getMemoryUsage = () => {
  if (window.performance && window.performance.memory) {
    return {
      usedJSHeapSize: window.performance.memory.usedJSHeapSize,
      totalJSHeapSize: window.performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
    };
  }
  return null;
};

// Render time measurement
export const measureRenderTime = async (renderFn) => {
  const start = now();
  await renderFn();
  const end = now();
  return end - start;
};

// DOM element count
export const getDOMElementCount = () => {
  return document.getElementsByTagName('*').length;
};

// Formula processing time
export const measureFormulaProcessingTime = async (processFn, formula) => {
  const start = now();
  await processFn(formula);
  const end = now();
  return end - start;
};

// Scroll performance
export const measureScrollPerformance = async (scrollFn) => {
  const start = now();
  await scrollFn();
  const end = now();
  return end - start;
};

// FPS measurement
export class FPSMeter {
  constructor() {
    this.frames = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.isRunning = false;
  }

  start() {
    this.frames = 0;
    this.lastTime = performance.now();
    this.isRunning = true;
    this.measure();
  }

  stop() {
    this.isRunning = false;
  }

  measure = () => {
    if (!this.isRunning) return this.fps;

    const currentTime = performance.now();
    this.frames++;

    if (currentTime >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (currentTime - this.lastTime));
      this.frames = 0;
      this.lastTime = currentTime;
    }

    requestAnimationFrame(this.measure);
    return this.fps;
  }
}

// Batch operation performance
export const measureBatchOperation = async (operation, size) => {
  const memoryBefore = getMemoryUsage();
  const start = now();
  
  await operation(size);
  
  const end = now();
  const memoryAfter = getMemoryUsage();
  
  return {
    time: end - start,
    memoryDelta: memoryAfter ? memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize : null
  };
};

// Overall performance metrics collector
export const collectMetrics = async (component, operations) => {
  const metrics = {
    memoryUsage: getMemoryUsage(),
    domElements: getDOMElementCount(),
    renderTime: 0,
    formulaProcessingTime: 0,
    scrollPerformance: 0,
    fps: 0
  };

  // Measure render time
  metrics.renderTime = await measureRenderTime(operations.render);

  // Measure formula processing
  if (operations.processFormula) {
    metrics.formulaProcessingTime = await measureFormulaProcessingTime(
      operations.processFormula,
      '=SUM(A1:A100)'
    );
  }

  // Measure scroll performance
  if (operations.scroll) {
    metrics.scrollPerformance = await measureScrollPerformance(operations.scroll);
  }

  // Measure FPS
  const fpsMeter = new FPSMeter();
  fpsMeter.start();
  
  // Simulate some interactions to measure FPS
  await new Promise(resolve => {
    let count = 0;
    const interval = setInterval(() => {
      if (count++ >= 10) {
        clearInterval(interval);
        fpsMeter.stop();
        metrics.fps = fpsMeter.fps;
        resolve();
      }
      // Trigger some DOM updates to measure FPS
      const container = document.querySelector('.table-container, .fortune-sheet-container, .univer-sheet-container');
      if (container) {
        container.style.transform = `translateY(${Math.random() * 10}px)`;
      }
    }, 100);
  });

  return metrics;
}; 