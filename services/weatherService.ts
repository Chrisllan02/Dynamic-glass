
import { WeatherData, DailyForecast } from "../types";
import { storage, STORAGE_KEYS } from "./storageService";

// --- CONSTANTES & CONFIGURAÇÕES ---
const CACHE_WEATHER_KEY = 'lumina_weather_data_v2';
const CACHE_TIMESTAMP_KEY = 'lumina_weather_ts_v2';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutos de cache local (App)
const GPS_MAX_AGE = 1000 * 60 * 30; // 30 minutos de cache de hardware (Browser)
const GPS_TIMEOUT = 10000; 
const API_TIMEOUT = 20000; // Aumentado para 20s para evitar timeouts em conexões lentas

// Fallback Coordinates (Padrão Neutro)
const DEFAULT_COORDS = {
  lat: -23.5505,
  lon: -46.6333,
  city: "São Paulo"
};

// Mapeamento WMO Weather Codes
export const getWeatherDescription = (code: number): string => {
  const codes: Record<number, string> = {
    0: "Céu Limpo",
    1: "Parcialmente Nublado", 2: "Parcialmente Nublado", 3: "Nublado",
    45: "Nevoeiro", 48: "Nevoeiro",
    51: "Garoa Leve", 53: "Garoa", 55: "Garoa Densa",
    61: "Chuva Leve", 63: "Chuva", 65: "Chuva Forte",
    71: "Neve Leve", 73: "Neve", 75: "Neve Forte",
    77: "Granizo",
    80: "Pancadas de Chuva", 81: "Pancadas de Chuva", 82: "Tempestade",
    95: "Trovoadas", 96: "Trovoadas c/ Granizo", 99: "Tempestade Severa"
  };
  return codes[code] || "Desconhecido";
};

// --- HELPERS ---

// Fetch com Timeout para evitar travamentos em redes instáveis
const fetchWithTimeout = async (url: string, timeout = API_TIMEOUT) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout}ms`);
        }
        throw error;
    }
};

// Geocoding Service (Busca Manual de Cidade)
export const searchCity = async (query: string): Promise<{ lat: number, lon: number, name: string, country: string } | null> => {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=pt&format=json`;
        const response = await fetchWithTimeout(url, 5000);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                lat: result.latitude,
                lon: result.longitude,
                name: result.name,
                country: result.country
            };
        }
        return null;
    } catch (e) {
        console.error("Geocoding failed", e);
        return null;
    }
};

// Tenta adivinhar coordenadas baseadas no fuso horário do sistema (Smart Fallback)
const getCoordsFromTimezone = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const tzMap: Record<string, { lat: number, lon: number, city: string }> = {
      // América do Sul
      'America/Sao_Paulo': { lat: -23.55, lon: -46.63, city: 'São Paulo' },
      'America/Argentina/Buenos_Aires': { lat: -34.60, lon: -58.38, city: 'Buenos Aires' },
      'America/Bogota': { lat: 4.71, lon: -74.07, city: 'Bogotá' },
      'America/Santiago': { lat: -33.44, lon: -70.66, city: 'Santiago' },
      // América do Norte
      'America/New_York': { lat: 40.71, lon: -74.00, city: 'Nova York' },
      'America/Los_Angeles': { lat: 34.05, lon: -118.24, city: 'Los Angeles' },
      'America/Chicago': { lat: 41.87, lon: -87.62, city: 'Chicago' },
      'America/Toronto': { lat: 43.65, lon: -79.38, city: 'Toronto' },
      // Europa
      'Europe/London': { lat: 51.50, lon: -0.12, city: 'Londres' },
      'Europe/Paris': { lat: 48.85, lon: 2.35, city: 'Paris' },
      'Europe/Berlin': { lat: 52.52, lon: 13.40, city: 'Berlim' },
      'Europe/Lisbon': { lat: 38.72, lon: -9.13, city: 'Lisboa' },
      'Europe/Madrid': { lat: 40.41, lon: -3.70, city: 'Madri' },
      'Europe/Rome': { lat: 41.90, lon: 12.49, city: 'Roma' },
      // Ásia/Oceania
      'Asia/Tokyo': { lat: 35.67, lon: 139.65, city: 'Tóquio' },
      'Asia/Shanghai': { lat: 31.23, lon: 121.47, city: 'Xangai' },
      'Asia/Dubai': { lat: 25.20, lon: 55.27, city: 'Dubai' },
      'Australia/Sydney': { lat: -33.86, lon: 151.20, city: 'Sydney' }
    };

    if (tzMap[tz]) return tzMap[tz];
  } catch (e) {
    // Ignore errors and fall through to default
  }
  return DEFAULT_COORDS;
};

// --- 1. REVERSE GEOCODING (Nome da Cidade) ---
const getCityName = async (lat: number, lon: number): Promise<string> => {
  try {
    const response = await fetchWithTimeout(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
      3000 // Timeout reduzido para 3s para não bloquear o clima principal
    );
    if (!response.ok) throw new Error("Reverse Geo failed");
    const data = await response.json();
    return data.city || data.locality || data.principalSubdivision || "Localização";
  } catch (error) {
    // Fallback: tenta extrair do fuso horário
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && tz.includes('/')) {
            return tz.split('/')[1].replace(/_/g, ' '); 
        }
    } catch (e) {}
    return "Localização";
  }
};

// --- 2. IP LOCATION (Fallback Silencioso) ---
const getLocationFromIP = async (): Promise<{latitude: number, longitude: number, city?: string} | null> => {
    try {
        const response = await fetchWithTimeout('https://ipapi.co/json/', 5000);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            return {
                latitude: data.latitude,
                longitude: data.longitude,
                city: data.city
            };
        }
        return null;
    } catch (e) {
        return null;
    }
};

// --- 3. WEATHER DATA FETCHING (Open-Meteo) ---
const fetchWeatherFromAPI = async (lat: number, lon: number, cityOverride?: string): Promise<WeatherData> => {
    let city = cityOverride;
    // Se não tiver cidade, tenta buscar, mas não falha se der erro
    if (!city) {
        try {
            city = await getCityName(lat, lon);
        } catch (e) {
            city = "Localização";
        }
    }
    
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    
    const response = await fetchWithTimeout(weatherUrl, API_TIMEOUT);
    if (!response.ok) throw new Error("Weather API failed");
    
    const data = await response.json();
    if (!data.current || !data.daily) throw new Error("Invalid weather data");

    const daily: DailyForecast[] = [];
    const days = data.daily.time;
    
    // Increased to 7 days for full week view
    for (let i = 0; i < Math.min(days.length, 7); i++) {
      const parts = days[i].split('-');
      const localDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      const dayNameRaw = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(localDate).replace('.', '');
      const dayNameFormatted = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);
      
      daily.push({
        date: days[i],
        dayName: i === 0 ? 'Hoje' : dayNameFormatted,
        day: dayNameFormatted,
        minTemp: Math.round(data.daily.temperature_2m_min[i]),
        maxTemp: Math.round(data.daily.temperature_2m_max[i]),
        weatherCode: data.daily.weather_code[i]
      });
    }

    return {
      currentTemp: Math.round(data.current.temperature_2m),
      currentCode: data.current.weather_code,
      city: city || "Localização", 
      daily
    };
};

// --- 4. CORE LOGIC (Tiered Strategy) ---
export const getWeatherData = async (): Promise<WeatherData> => {
    
    // A) LEVEL 0: MANUAL LOCATION (User Preference Override)
    const manualLoc = await storage.get<{ lat: number, lon: number, city: string }>(STORAGE_KEYS.MANUAL_LOCATION);
    if (manualLoc) {
        const cachedData = await storage.get<WeatherData>(CACHE_WEATHER_KEY);
        const cachedTime = await storage.get<number>(CACHE_TIMESTAMP_KEY);
        const isSameCity = cachedData?.city === manualLoc.city;
        
        if (cachedData && cachedTime && isSameCity && (Date.now() - cachedTime < CACHE_DURATION)) {
            return cachedData;
        }
        
        try {
            const weather = await fetchWeatherFromAPI(manualLoc.lat, manualLoc.lon, manualLoc.city);
            storage.set(CACHE_WEATHER_KEY, weather);
            storage.set(CACHE_TIMESTAMP_KEY, Date.now());
            return weather;
        } catch (e) {
             if (cachedData) return cachedData;
             throw e;
        }
    }

    // B) LEVEL 1: APP CACHE (Instant)
    const cachedData = await storage.get<WeatherData>(CACHE_WEATHER_KEY);
    const cachedTime = await storage.get<number>(CACHE_TIMESTAMP_KEY);
    const now = Date.now();

    if (cachedData && cachedTime && (now - cachedTime < CACHE_DURATION)) {
        return cachedData;
    }

    const saveAndReturn = async (lat: number, lon: number, city?: string) => {
        try {
            const weather = await fetchWeatherFromAPI(lat, lon, city);
            storage.set(CACHE_WEATHER_KEY, weather);
            storage.set(CACHE_TIMESTAMP_KEY, Date.now());
            return weather;
        } catch (error) {
            if (cachedData) return cachedData; // Fallback to stale cache if new fetch fails
            throw error;
        }
    };

    // C) LEVEL 2: PERMISSION CHECK & GPS
    let permissionState = 'prompt';
    if (navigator.permissions && navigator.permissions.query) {
        try {
            // @ts-ignore
            const result = await navigator.permissions.query({ name: 'geolocation' });
            permissionState = result.state;
        } catch (e) {}
    }

    return new Promise((resolve, reject) => {
        if (permissionState === 'granted') {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve(saveAndReturn(pos.coords.latitude, pos.coords.longitude));
                },
                () => {
                    fallbackToIp(resolve, reject, saveAndReturn, cachedData);
                },
                { 
                    maximumAge: GPS_MAX_AGE, 
                    timeout: GPS_TIMEOUT,    
                    enableHighAccuracy: false 
                }
            );
        } else {
            fallbackToIp(resolve, reject, saveAndReturn, cachedData);
        }
    });
};

async function fallbackToIp(
    resolve: (value: WeatherData | PromiseLike<WeatherData>) => void,
    reject: (reason?: any) => void,
    saveFn: (lat: number, lon: number, city?: string) => Promise<WeatherData>,
    cachedData: WeatherData | null
) {
    const ipLoc = await getLocationFromIP();
    
    if (ipLoc) {
        try {
            const data = await saveFn(ipLoc.latitude, ipLoc.longitude, ipLoc.city);
            resolve(data);
        } catch (e) {
            resolveWithDefault(resolve, reject, saveFn, cachedData);
        }
    } else {
        resolveWithDefault(resolve, reject, saveFn, cachedData);
    }
}

function resolveWithDefault(
    resolve: (value: WeatherData | PromiseLike<WeatherData>) => void,
    reject: (reason?: any) => void,
    saveFn: (lat: number, lon: number, city?: string) => Promise<WeatherData>,
    cachedData: WeatherData | null
) {
    // 1. First priority: Cached data (even if expired)
    if (cachedData) {
        resolve(cachedData);
        return;
    } 
    
    // 2. Second priority: Smart Default based on Timezone
    const smartDefault = getCoordsFromTimezone();
    saveFn(smartDefault.lat, smartDefault.lon, smartDefault.city)
        .then(resolve)
        .catch((err) => {
            console.warn("Weather load failed, using Safe Fallback.", err);
            // 3. Final priority: Safe Mock Data to prevent crash
            resolve({
                currentTemp: 22,
                currentCode: 1, // Partly cloudy
                city: smartDefault.city,
                daily: Array(7).fill(null).map((_, i) => ({
                    date: new Date().toISOString(),
                    dayName: '---',
                    day: '---',
                    minTemp: 0,
                    maxTemp: 0,
                    weatherCode: 0
                }))
            });
        });
}
