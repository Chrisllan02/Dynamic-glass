
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DynamicIsland } from './components/DynamicIsland';
import css from './index.css?inline'; // Import CSS as string for injection

const OVERLAY_ID = 'lumina-dynamic-island-host';

const mountOverlay = () => {
  // 1. Check if already exists to prevent duplicates
  if (document.getElementById(OVERLAY_ID)) return;

  // 2. Create the Host Element
  const host = document.createElement('div');
  host.id = OVERLAY_ID;
  
  // High Z-Index ensures it floats above everything
  // Height 0 ensures it doesn't block clicks on the page (pointer-events handled in component)
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100%';
  host.style.height = '0';
  host.style.zIndex = '2147483647';
  
  document.body.appendChild(host);

  // 3. Create Shadow DOM (The "Force Field")
  const shadow = host.attachShadow({ mode: 'open' });

  // 4. Inject Styles inside Shadow DOM
  const styleTag = document.createElement('style');
  styleTag.textContent = css; // Inject compiled Tailwind CSS
  shadow.appendChild(styleTag);

  // 5. Inject Material Symbols Font (needs to be loaded in the main document context or imported in CSS)
  // Since fonts are global resources, we ensure the link exists in head
  if (!document.querySelector('link[href*="Material+Symbols+Outlined"]')) {
    const fontLink = document.createElement('link');
    fontLink.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
  }
  
  // Also add Inter font
  if (!document.querySelector('link[href*="Inter"]')) {
      const fontLink = document.createElement('link');
      fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap";
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
  }

  // 6. Create React Root
  const rootDiv = document.createElement('div');
  rootDiv.id = 'lumina-root';
  // Reset CSS properties for the root to avoid inheritance edge cases
  rootDiv.style.all = 'initial'; 
  rootDiv.style.display = 'block';
  rootDiv.style.fontFamily = "'Inter', sans-serif";
  
  shadow.appendChild(rootDiv);

  const root = createRoot(rootDiv);
  
  // 7. Render
  // Note: We force isDarkMode to true for consistency in overlay mode, 
  // or you could sync this from storage if you wanted user preference.
  root.render(
    <React.StrictMode>
        <div className="lumina-extension-scope" style={{ position: 'relative', zIndex: 50, pointerEvents: 'auto' }}>
            <DynamicIsland isDarkMode={true} isHidden={false} />
        </div>
    </React.StrictMode>
  );
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountOverlay);
} else {
    mountOverlay();
}
