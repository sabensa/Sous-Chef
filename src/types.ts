export interface Chef {
  id: string;
  title: string;
  titleHe: string;
  icon: string;
  emoji: string;
  bgColor: string;
}

export interface Recipe {
  name: string;
  nameHe: string;
  prepTime: string;
  ingredients: string[];
  ingredientsHe: string[];
  instructions: string[];
  instructionsHe: string[];
  imageUrl?: string;
  history: string;
  historyHe: string;
}

export interface Wine {
  name: string;
  nameHe: string;
  type: string;
  typeHe: string;
  region: string;
  regionHe: string;
  grapes: string;
  grapesHe: string;
  description: string;
  descriptionHe: string;
  servingTip: string;
  servingTipHe: string;
}

export interface Cocktail {
  name: string;
  nameHe: string;
  ingredients: string[];
  ingredientsHe: string[];
  instructions: string[];
  instructionsHe: string[];
  glass: string;
  glassHe: string;
  garnish: string;
  garnishHe: string;
  description: string;
  descriptionHe: string;
}

export type AppState = 'idle' | 'processing' | 'result' | 'error';
export type BartenderState = 'idle' | 'wine-wizard' | 'processing' | 'result';
export type Tab = 'chef' | 'bartender';
