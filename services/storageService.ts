

declare var chrome: any;

export const STORAGE_KEYS = {
  THEME: 'lumina_theme',
  DARK_MODE: 'lumina_dark_mode',
  ANIMATION: 'lumina_anim_override',
  BACKGROUND_IMAGE: 'lumina_background_image',
  USER_NAME: 'lumina_user_name', 
  USER_API_KEY: 'lumina_user_api_key_v1',
  UI_SOUNDS: 'lumina_ui_sounds_enabled',
  LINKS: 'lumina_links',
  SHOW_LINKS: 'lumina_show_links',
  
  REDUCE_MOTION: 'lumina_reduce_motion',
  GLASS_BLUR: 'lumina_glass_blur_strength',
  ONBOARDING_COMPLETED: 'lumina_onboarding_done_v1',
  
  MANUAL_LOCATION: 'lumina_manual_location',

  MODULE_CONFIG: 'lumina_module_config_v2', 
  ISLAND_CONFIG: 'lumina_island_config',
  CLOCK_CONFIG: 'lumina_clock_config',
  LAYOUT_CONFIG: 'lumina_layout_config_v1',
  APP_ICONS: 'lumina_app_icons_v3',
  
  QUOTE_CACHE: 'lumina_quote',
  QUOTE_DATE: 'lumina_quote_date',
  USER_SIGN: 'lumina_user_sign',
  HOROSCOPE_CACHE: 'lumina_horoscope_cache',
  HOROSCOPE_DATE: 'lumina_horoscope_date',
  TECH_FACT_CACHE: 'lumina_tech_fact_cache',
  TECH_FACT_DATE: 'lumina_tech_fact_date',
  
  NOTES_CONTENT: 'lumina_notes_content',
  TODO_TASKS: 'lumina_todo_tasks',
  REMINDERS_DATA: 'lumina_reminders_data',
  CALENDAR_EVENTS: 'lumina_calendar_events',
  
  FOCUS_SUBTASKS: 'lumina_focus_subtasks',
  TIMER_STATE: 'lumina_timer_state_v1',

  TOUR_COMPLETED: 'lumina_tour_completed_v2',
  
  LAST_ISLAND_APP: 'lumina_last_island_app'
};

const isExtension = typeof chrome !== 'undefined' && !!chrome.storage;

const LOCAL_ONLY_KEYS = [
    STORAGE_KEYS.BACKGROUND_IMAGE,
    STORAGE_KEYS.NOTES_CONTENT,
    STORAGE_KEYS.TODO_TASKS,
    STORAGE_KEYS.CALENDAR_EVENTS,
    STORAGE_KEYS.QUOTE_CACHE,
    STORAGE_KEYS.HOROSCOPE_CACHE,
    STORAGE_KEYS.TECH_FACT_CACHE,
    STORAGE_KEYS.TIMER_STATE,
    STORAGE_KEYS.LAST_ISLAND_APP,
    STORAGE_KEYS.USER_API_KEY
];

export const storage = {
  get: async <T>(key: string): Promise<T | null> => {
    if (isExtension) {
      return new Promise((resolve) => {
        try {
            const isLocal = LOCAL_ONLY_KEYS.includes(key);
            const storageArea = isLocal ? chrome.storage.local : chrome.storage.sync;

            storageArea.get([key], (result: any) => {
                if (chrome.runtime.lastError) {
                    chrome.storage.local.get([key], (localResult: any) => {
                        resolve(localResult[key] !== undefined ? localResult[key] : null);
                    });
                } else {
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
      const item = localStorage.getItem(key);
      if (!item) return null;
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    }
  },

  set: async (key: string, value: any): Promise<void> => {
    if (isExtension) {
      return new Promise((resolve) => {
        try {
            const isLocal = LOCAL_ONLY_KEYS.includes(key);
            const storageArea = isLocal ? chrome.storage.local : chrome.storage.sync;

            storageArea.set({ [key]: value }, () => {
                 if (chrome.runtime.lastError) {
                     console.warn(`Storage set error for ${key} in ${isLocal ? 'local' : 'sync'}, trying local fallback`, chrome.runtime.lastError);
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
      localStorage.setItem(key, JSON.stringify(value));
      return Promise.resolve();
    }
  },

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

  exportAll: async (): Promise<string> => {
    const data: Record<string, any> = {};
    const keys = Object.values(STORAGE_KEYS);
    
    for (const key of keys) {
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

  importAll: async (jsonString: string): Promise<boolean> => {
      try {
          const data = JSON.parse(jsonString);
          const keys = Object.keys(data);
          
          for (const key of keys) {
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
