import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Developer / Inspect Source Watermark
console.log(
  `%c
  ██╗   ██╗██╗   ██╗███╗   ██╗ ██████╗ 
  ╚██╗ ██╔╝██║   ██║████╗  ██║██╔═████╗
   ╚████╔╝ ██║   ██║██╔██╗ ██║██║██╔██║
    ╚██╔╝  ██║   ██║██║╚██╗██║████╔╝██║
     ██║   ╚██████╔╝██║ ╚████║╚██████╔╝
     ╚═╝    ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ 
  
  ⚡ YUNØ WEB WORKSPACE & MEDIA SUITE
  ✦ System Architecture Active (v2.4.0)
`,
  'color: #f59e0b; font-family: monospace; font-weight: bold;'
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
