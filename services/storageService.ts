
// Wrapper to handle Chrome Storage API with localStorage fallback
// This ensures the extension syncs data across devices when installed,
// but still works in a standard web browser environment for development.

declare var chrome: any;

export const STORAGE_KEYS = {
  THEME: 'lumina_theme',
  DARK_MODE: 'lumina_dark_mode',
  ANIMATION: 'lumina_anim_override',
  BACKGROUND_IMAGE: 'lumina_background_image', // Heavy -> Local
  USER_NAME: 'lumina_user_name', 
  // FIX: Removed USER_API_KEY as per guidelines (use process.env.API_KEY exclusively)
  UI_SOUNDS: 'lumina_ui_sounds_enabled',
  LINKS: 'lumina_links',
  SHOW_LINKS: 'lumina_show_links',
  
  // UX Preferences
  REDUCE_MOTION: 'lumina_reduce_motion',
  GLASS_BLUR: 'lumina_glass_blur_strength', // Novo: Intensidade do Blur
  ONBOARDING_COMPLETED: 'lumina_onboarding_done_v1', // Flag explícita para onboarding
  
  // Weather Configuration
  MANUAL_LOCATION: 'lumina_manual_location',

  // Configs
  MODULE_CONFIG: 'lumina_module_config_v2', 
  ISLAND_CONFIG: 'lumina_island_config',
  CLOCK_CONFIG: 'lumina_clock_config',
  LAYOUT_CONFIG: 'lumina_layout_config_v1',
  APP_ICONS: 'lumina_app_icons_v3',
  
  // Content / Heavy Data -> Forces Local Storage
  QUOTE_CACHE: 'lumina_quote',
  QUOTE_DATE: 'lumina_quote_date',
  USER_SIGN: 'lumina_user_sign',
  HOROSCOPE_CACHE: 'lumina_horoscope_cache',
  HOROSCOPE_DATE: 'lumina_horoscope_date',
  TECH_FACT_CACHE: 'lumina_tech_fact_cache',
  TECH_FACT_DATE: 'lumina_tech_fact_date',
  
  NOTES_CONTENT: 'lumina_notes_content', // Heavy
  TODO_TASKS: 'lumina_todo_tasks',       // Heavy
  REMINDERS_DATA: 'lumina_reminders_data', // Heavy
  CALENDAR_EVENTS: 'lumina_calendar_events', // Heavy
  
  // Focus Mode
  FOCUS_SUBTASKS: 'lumina_focus_subtasks',
  TIMER_STATE: 'lumina_timer_state_v1', // New: Persist Timer

  // Tutorial
  TOUR_COMPLETED: 'lumina_tour_completed_v2',
  
  // Island State
  LAST_ISLAND_APP: 'lumina_last_island_app'
};

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

// Keys that should ALWAYS use local storage to avoid Sync Quota limits (100KB total)
// or because they are device-specific cache.
const LOCAL_ONLY_KEYS = [
    STORAGE_KEYS.BACKGROUND_IMAGE,
    STORAGE_KEYS.NOTES_CONTENT,
    STORAGE_KEYS.TODO_TASKS,
    STORAGE_KEYS.CALENDAR_EVENTS,
    STORAGE_KEYS.QUOTE_CACHE,
    STORAGE_KEYS.HOROSCOPE_CACHE,
    STORAGE_KEYS.TECH_FACT_CACHE,
    STORAGE_KEYS.TIMER_STATE,
    STORAGE_KEYS.LAST_ISLAND_APP 
];

export const storage = {
  /**
   * Get a value from storage
   */
  get: async <T>(key: string): Promise<T | null> => {
    if (isExtension) {
      return new Promise((resolve) => {
        try {
            const isLocal = LOCAL_ONLY_KEYS.includes(key);
            const storageArea = isLocal ? chrome.storage.local : chrome.storage.sync;

            storageArea.get([key], (result: any) => {
                if (chrome.runtime.lastError) {
                    // Fallback to local if sync fails
                    chrome.storage.local.get([key], (localResult: any) => {
                        resolve(localResult[key] !== undefined ? localResult[key] : null);
                    });
                } else {
                    // If not found in primary, try local (migration or fallback)
                    if (result[key] === undefined && !isLocal) {
                        chrome.storage.local.get([key], (localResult: any) => {
                             resolve(localResult[key] !== undefined ? localResult[key] : null);
                        });
                    } else {
                        resolve(result[key] !== undefined ? result[key] : null);
                    }
                }
            });
        } catch (e) {
            console.error("Chrome storage failed", e);
            resolve(null);
        }
      });
    } else {
      // Web Environment Fallback
      const item = localStorage.getItem(key);
      if (!item) return null;
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    }
  },

  /**
   * Save a value from storage
   */
  set: async (key: string, value: any): Promise<void> => {
    if (isExtension) {
      return new Promise((resolve) => {
        try {
            const isLocal = LOCAL_ONLY_KEYS.includes(key);
            const storageArea = isLocal ? chrome.storage.local : chrome.storage.sync;

            storageArea.set({ [key]: value }, () => {
                 if (chrome.runtime.lastError) {
                     console.warn(`Storage set error for ${key} in ${isLocal ? 'local' : 'sync'}, trying local fallback`, chrome.runtime.lastError);
                     // Fallback to local if sync quota exceeded
                     chrome.storage.local.set({ [key]: value }, resolve);
                 } else {
                     resolve();
                 }
            });
        } catch (e) {
            console.error("Chrome storage set failed", e);
            resolve();
        }
      });
    } else {
      // Web Environment Fallback
      localStorage.setItem(key, JSON.stringify(value));
      return Promise.resolve();
    }
  },

  /**
   * Remove a value from storage
   */
  remove: async (key: string): Promise<void> => {
    if (isExtension) {
        return new Promise((resolve) => {
            chrome.storage.sync.remove(key, () => {
                chrome.storage.local.remove(key, resolve);
            });
        });
    } else {
        localStorage.removeItem(key);
        return Promise.resolve();
    }
  },

  /**
   * Clear all values from storage
   */
  clear: async (): Promise<void> => {
    if (isExtension) {
        return new Promise((resolve) => {
            try {
                chrome.storage.sync.clear(() => {
                    chrome.storage.local.clear(() => {
                        resolve();
                    });
                });
            } catch (e) {
                console.error("Chrome storage clear failed", e);
                resolve();
            }
        });
    } else {
        localStorage.clear();
        return Promise.resolve();
    }
  },

  /**
   * Export all data for backup
   */
  exportAll: async (): Promise<string> => {
    const data: Record<string, any> = {};
    const keys = Object.values(STORAGE_KEYS);
    
    for (const key of keys) {
        // Skip ephemeral caches if desired, or keep them. 
        // We skip extremely heavy image data to keep backup size manageable, 
        // unless user specifically wants it. For now, we include everything but handle errors.
        try {
            const value = await storage.get(key);
            if (value !== null && value !== undefined) {
                data[key] = value;
            }
        } catch (e) {
            console.warn(`Failed to export key: ${key}`);
        }
    }
    return JSON.stringify(data);
  },

  /**
   * Import data from backup
   */
  importAll: async (jsonString: string): Promise<boolean> => {
      try {
          const data = JSON.parse(jsonString);
          const keys = Object.keys(data);
          
          for (const key of keys) {
              // Only import known keys to prevent pollution
              if (Object.values(STORAGE_KEYS).includes(key)) {
                  await storage.set(key, data[key]);
              }
          }
          return true;
      } catch (e) {
          console.error("Import failed", e);
          return false;
      }
  }
};
