
import React from 'react';

export interface QuickLink {
  id: string;
  name: string;
  url: string;
  icon?: React.ReactNode | string;
}

export interface QuoteData {
  text: string;
  author: string;
}

export interface HoroscopeData {
  sign: string;
  text: string;
  mood: string;
}

export interface TechFactData {
  fact: string;
  category: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  completed?: boolean;
  time?: string; // HH:mm optional
}

export type Priority = 'high' | 'medium' | 'low';

export interface TodoTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  priority?: Priority;
  category?: string;
  time?: string; // HH:mm
}

export interface Reminder {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  sources?: { title: string; uri: string }[];
}

export type ThemeId = 'default' | 'retro' | 'fresh' | 'chroma' | 'minimal' | 'nordic' | 'holo' | 'weather' | 'mix' | 'waves' | 'book' | 'liquid';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  colors: {
    background: string;
    blob1: string;
    blob2: string;
    blob3: string;
    accent: string;
  };
}

export type ClockPosition = 'left' | 'center' | 'right';
export type ClockWeight = 'thin' | 'light' | 'regular' | 'bold' | 'extra-bold' | 'black';
export type ClockFont = 'inter' | 'modern' | 'rounded' | 'serif' | 'elegant' | 'slab' | 'mono' | 'condensed' | 'tall' | 'heavy';
export type ClockColorMode = 'theme' | 'white' | 'black' | 'gold' | 'neon';
export type ClockSize = 'small' | 'medium' | 'large' | 'huge' | 'massive';

export interface ClockConfig {
  format: '12h' | '24h';
  scale: number; // 0.5 to 1.5
  position: ClockPosition;
  fontWeight: ClockWeight;
  font: ClockFont;
  colorMode: ClockColorMode;
  fontSize: ClockSize;
}

export interface DailyForecast {
  date: string;
  dayName: string;
  day: string; // Add day property
  minTemp: number;
  maxTemp: number;
  weatherCode: number;
}

export interface WeatherData {
  currentTemp: number;
  currentCode: number;
  city: string;
  daily: DailyForecast[];
}

export type AnimationStyle = 'auto' | 'flow' | 'pulse' | 'ocean' | 'rain' | 'orbit' | 'mesh';

export type ModuleId = 
  | 'weather' 
  | 'pomodoro' 
  | 'notes' 
  | 'calendar'
  | 'todo'
  | 'reminders'
  | 'soundscapes'
  | 'quote' 
  | 'horoscope' 
  | 'tech' 
  | 'breathe'
  | 'planner';

export type ModuleMode = 'off' | 'widget' | 'carousel';

export type ModuleConfig = Record<ModuleId, ModuleMode>;

export type IslandAppId = 'music' | 'soundscapes' | 'focus-timer' | 'calculator' | 'translate' | 'camera' | 'calendar';

export type IslandState = 'idle' | 'menu' | 'music' | 'focus-timer' | 'ask-ai' | 'calculator' | 'translate' | 'camera' | 'soundscapes' | 'calendar';

export interface IslandConfig {
  enabledApps: IslandAppId[];
}

export type WidgetId = ModuleId; 
export type ZoneId = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type LayoutConfig = {
  [key in ZoneId]: ModuleId[];
};
