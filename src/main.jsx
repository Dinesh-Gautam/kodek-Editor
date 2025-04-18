import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import './index.css';

import App from './App.jsx';
import { CollaborationProvider } from './context/collabration.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CollaborationProvider>
      <App />
    </CollaborationProvider>
  </StrictMode>,
);
