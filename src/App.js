import React from 'react';
import './App.css';
import Table from './components/Table';
import Benchmark from './components/Benchmark';
import './styles/Benchmark.css';

function App() {
  return (
    <div className="app">
      <header>
        <h1>Large Table Renderer</h1>
      </header>
      <main>
        <Table />
        <Benchmark />
      </main>
    </div>
  );
}

export default App;
