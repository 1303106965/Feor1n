import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BootstrapProvider } from './context/BootstrapContext';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <BootstrapProvider>
        <App />
      </BootstrapProvider>
    </BrowserRouter>
  </StrictMode>,
);

// PWA：注册与 sw.js 配套的推送收件 Service Worker（通知开关在后台页面管理）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
