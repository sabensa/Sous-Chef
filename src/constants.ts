import { Chef } from './types';

export const CHEFS: Chef[] = [
  {
    id: 'italian',
    title: 'Italian Cuisine',
    titleHe: 'מטבח איטלקי',
    icon: 'Utensils',
    emoji: '🍝',
    bgColor: '#fed7aa' // orange-200
  },
  {
    id: 'patisserie',
    title: 'Patisserie',
    titleHe: 'קונדיטוריה',
    icon: 'Cake',
    emoji: '🧁',
    bgColor: '#fbcfe8' // pink-200
  },
  {
    id: 'asian',
    title: 'Asian Fusion',
    titleHe: 'פיוז\'ן אסייתי',
    icon: 'Soup',
    emoji: '🍣',
    bgColor: '#ddd6fe' // violet-200
  },
  {
    id: 'rotisserie',
    title: 'Rotisserie',
    titleHe: 'צלייה על האש',
    icon: 'Flame',
    emoji: '🥩',
    bgColor: '#fecaca' // red-200
  },
  {
    id: 'seafood',
    title: 'Seafood',
    titleHe: 'פירות ים',
    icon: 'Fish',
    emoji: '🐟',
    bgColor: '#bfdbfe' // blue-200
  },
  {
    id: 'vegan',
    title: 'Vegan Specialist',
    titleHe: 'מומחה טבעוני',
    icon: 'Leaf',
    emoji: '🥗',
    bgColor: '#bbf7d0' // green-200
  }
];

export const WINE_TYPES = [
  { id: 'red', label: 'אדום', emoji: '🍷' },
  { id: 'white', label: 'לבן', emoji: '🥂' },
  { id: 'rose', label: 'רוזה', emoji: '🌸' },
  { id: 'sparkling', label: 'מבעבע', emoji: '🍾' }
];

export const WINE_STYLES: Record<string, { id: string, label: 'עשיר ומלא' | 'פירותי ורך' | 'יבש ומורכב' | 'קל וזורם' | 'פריך ומרענן' | 'פירותי ואקזוטי' | 'יבש ומינרלי' | 'עשיר ושמנתי' | 'יבש ומרענן' | 'פירותי וקל' | 'חצי-יבש ועדין' | 'מלא ומורכב' | 'ברוט - יבש מאוד' | 'אקסטרה דריי' | 'חצי יבש' | 'מתוק וחגיגי' }[]> = {
  red: [
    { id: 'rich_bold', label: 'עשיר ומלא' },
    { id: 'fruity', label: 'פירותי ורך' },
    { id: 'dry', label: 'יבש ומורכב' },
    { id: 'light', label: 'קל וזורם' }
  ],
  white: [
    { id: 'crisp', label: 'פריך ומרענן' },
    { id: 'fruity', label: 'פירותי ואקזוטי' },
    { id: 'dry', label: 'יבש ומינרלי' },
    { id: 'creamy', label: 'עשיר ושמנתי' }
  ],
  rose: [
    { id: 'dry', label: 'יבש ומרענן' },
    { id: 'fruity', label: 'פירותי וקל' },
    { id: 'semi_sweet', label: 'חצי-יבש ועדין' },
    { id: 'rich', label: 'מלא ומורכב' }
  ],
  sparkling: [
    { id: 'brut', label: 'ברוט - יבש מאוד' },
    { id: 'extra_dry', label: 'אקסטרה דריי' },
    { id: 'semi_sweet', label: 'חצי יבש' },
    { id: 'sweet', label: 'מתוק וחגיגי' }
  ]
};
