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

// Intercept and prevent third-party SDK crashes (e.g. Lumin worker domain fetch)
window.addEventListener('unhandledrejection', (event) => {
  const reason = String(event?.reason?.message || event?.reason || '');
  if (
    reason.includes('Lumin') ||
    reason.includes('domain fetch failed') ||
    reason.includes('Worker connection')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
    console.warn('[SDK Handled]:', reason);
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event?.message || '');
  if (
    msg.includes('Lumin') ||
    msg.includes('domain fetch failed') ||
    msg.includes('Worker connection')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
    console.warn('[SDK Handled]:', msg);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
