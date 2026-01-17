
// Service Worker do Lumina
// Gerencia instalação, atualizações e CONTROLE DE MÍDIA

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Lumina Extension Installed');
    chrome.storage.sync.set({ lumina_tour_completed_v2: false });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({});
});

// --- MEDIA CONTROL ENGINE ---

// Script injetado para controlar mídia na página alvo
function contentScriptControl(action, value) {
  const media = document.querySelector('video, audio');
  if (!media) return null;

  if (action === 'playPause') {
    if (media.paused) media.play();
    else media.pause();
  } else if (action === 'next') {
    // Tenta botões comuns de Next (YouTube, Spotify web)
    const nextBtn = document.querySelector('.ytp-next-button') || document.querySelector('[data-testid="control-button-skip-forward"]');
    if (nextBtn) nextBtn.click();
    else media.currentTime = media.duration; // Fallback
  } else if (action === 'prev') {
    const prevBtn = document.querySelector('.ytp-prev-button') || document.querySelector('[data-testid="control-button-skip-back"]');
    if (prevBtn) prevBtn.click();
    else media.currentTime = 0;
  } else if (action === 'seek') {
    media.currentTime = value;
  }

  // Extração de Metadados
  let title = document.title;
  let artist = new URL(window.location.href).hostname.replace('www.', '');
  let cover = '';
  let duration = media.duration || 0;
  let currentTime = media.currentTime || 0;
  let isPlaying = !media.paused;

  // Youtube Specific
  if (window.location.hostname.includes('youtube.com')) {
      const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer');
      if (titleEl) title = titleEl.innerText;
      
      // Tentar pegar thumbnail de alta qualidade do YouTube
      const videoIdMatch = window.location.search.match(/v=([^&]+)/);
      if (videoIdMatch) {
          cover = `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
      }
      artist = "YouTube";
  } 
  // Media Session API (Spotify, SoundCloud, etc)
  else if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
      title = navigator.mediaSession.metadata.title || title;
      artist = navigator.mediaSession.metadata.artist || artist;
      if (navigator.mediaSession.metadata.artwork && navigator.mediaSession.metadata.artwork.length > 0) {
          cover = navigator.mediaSession.metadata.artwork[navigator.mediaSession.metadata.artwork.length - 1].src;
      }
  }

  return { title, artist, cover, duration, currentTime, isPlaying };
}

// Encontrar a aba que está tocando áudio
async function getActiveMediaTab() {
  const tabs = await chrome.tabs.query({ audible: true });
  if (tabs.length > 0) return tabs[0];
  
  // Se nada estiver audível agora, tenta a última aba ativa que seja YouTube/Spotify
  // (Simplificado para pegar a última audível conhecida ou a tab ativa se tiver video)
  return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type.startsWith('MEDIA_')) {
    (async () => {
      const tab = await getActiveMediaTab();
      
      if (!tab) {
        // Fallback: Tenta achar uma aba do YouTube mesmo pausada
        const ytTabs = await chrome.tabs.query({ url: "*://*.youtube.com/watch*" });
        if (ytTabs.length > 0) {
             executeMediaScript(ytTabs[0].id, request.action, request.value, sendResponse);
        } else {
             sendResponse({ error: "No media found" });
        }
        return;
      }

      executeMediaScript(tab.id, request.action, request.value, sendResponse);
    })();
    return true; // Keep channel open
  }
});

function executeMediaScript(tabId, action, value, sendResponse) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: contentScriptControl,
        args: [action, value]
    }, (results) => {
        if (chrome.runtime.lastError || !results || !results[0]) {
            sendResponse({ error: "Script failed" });
        } else {
            sendResponse(results[0].result);
        }
    });
}
