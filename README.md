# Large Table Renderer

An Excel-like table renderer capable of handling large-scale data. It efficiently processes 1 million rows while supporting formula calculations and cell dependencies.

## Key Features

### 1. Virtualized Scrolling
- Smooth scrolling through 1 million rows
- Memory-efficient rendering of only visible data
- Dynamic data loading during scroll

### 2. Formula Calculation
- Excel-like formula syntax support
- Cell reference calculations (e.g., =A1+B1)
- Real-time formula evaluation and updates

### 3. Cell Dependency Management
- Automatic cell dependency tracking
- Efficient updates through dependency graph
- Prevention of circular references

### 4. Optimized Performance
- Prevention of unnecessary re-renders using React.memo
- Calculation result caching
- Performance optimization through batch updates

## Tech Stack

- React 18
- JavaScript
- CSS

## Getting Started

1. Install Dependencies
```bash
npm install
```

2. Run Development Server
```bash
npm start
```

3. View in Browser
```
http://localhost:3000
```

## Implementation Details

### 1. Virtual Scroll Implementation
- Scroll bar sizing based on total table height
- Rendering of only visible rows based on current scroll position
- Dynamic adjustment of top/bottom padding for scroll position correction

### 2. Formula Processing
- Cell reference parsing using regular expressions
- Dependency graph construction and management
- Recursive formula evaluation logic

### 3. State Management
- Table data managed in object format
- O(1) access using cell IDs as keys
- Separate storage for formulas and calculated values

### 4. Performance Optimization
- Batch updates using requestAnimationFrame
- Render optimization through memoization
- Prevention of duplicate calculations using calculation cache

## Project Structure

```
src/
  ├── components/
  │   ├── Table.js     # Main table component
  │   └── Cell.js      # Individual cell component
  ├── styles/
  │   └── Table.css    # Table styles
  └── App.js           # Application entry point
``` 