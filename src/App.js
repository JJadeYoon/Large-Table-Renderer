import React from 'react';
import './App.css';
import Table from './components/Table';

function App() {
  return (
    <div className="app">
      <header>
        <h1>Large Table Renderer</h1>
      </header>
      <main>
        <Table />
      </main>
    </div>
  );
}

export default App;
