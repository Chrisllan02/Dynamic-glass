import React from 'react';
import { createRoot } from 'react-dom/client';
import { DynamicIsland } from '../components/DynamicIsland';
import css from './index.css?inline';

const OVERLAY_ID = 'lumina-dynamic-island-host';

const mountOverlay = () => {
  if (document.getElementById(OVERLAY_ID)) return;

  const host = document.createElement('div');
  host.id = OVERLAY_ID;
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100%';
  host.style.height = '0';
  host.style.zIndex = '2147483647';

  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const styleTag = document.createElement('style');
  styleTag.textContent = css;
  shadow.appendChild(styleTag);

  if (!document.querySelector('link[href*="Material+Symbols+Outlined"]')) {
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }

  if (!document.querySelector('link[href*="Inter"]')) {
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }

  const rootDiv = document.createElement('div');
  rootDiv.id = 'lumina-root';
  rootDiv.style.all = 'initial';
  rootDiv.style.display = 'block';
  rootDiv.style.fontFamily = "'Inter', sans-serif";

  shadow.appendChild(rootDiv);

  const root = createRoot(rootDiv);
  root.render(
    <React.StrictMode>
      <div className="lumina-extension-scope" style={{ position: 'relative', zIndex: 50, pointerEvents: 'auto' }}>
        <DynamicIsland isDarkMode={true} isHidden={false} />
      </div>
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountOverlay);
} else {
  mountOverlay();
}
