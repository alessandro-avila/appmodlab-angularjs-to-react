/**
 * React entry point.
 *
 * React 19: `createRoot(container).render(<App />)`.
 * NOT React 18's `ReactDOM.render(<App />, container)`, which is removed in 19.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
