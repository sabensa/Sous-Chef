import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wine, GlassWater, Sun, Moon, Clock, Info, RefreshCw, Check, ChevronDown, ChevronLeft, Thermometer, X, Utensils, Cake, Soup, Flame, Fish, Leaf } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';
import { CHEFS, WINE_TYPES, WINE_STYLES } from './constants';
import { Chef, Recipe, Wine as WineType, Cocktail, AppState, BartenderState, Tab } from './types';

// Safe API key retrieval
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

const ChefIcon = ({ chef, className }: { chef: Chef, className?: string }) => {
  return (
    <div 
      className={`flex items-center justify-center rounded-2xl shadow-sm transition-all ${className}`}
      style={{ backgroundColor: chef.bgColor }}
    >
      <span className="text-4xl">{chef.emoji}</span>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chef');
  const [language, setLanguage] = useState<'he' | 'en'>('he');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('sous-chef-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Chef State
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null);
  const [ingredients, setIngredients] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [recipeImageUrl, setRecipeImageUrl] = useState<string | null>(null);
  const [variation, setVariation] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Bartender State
  const [bartenderState, setBartenderState] = useState<BartenderState>('idle');
  const [selectedDrinkType, setSelectedDrinkType] = useState<'יין' | 'קוקטייל' | null>(null);
  const [wineWizardStep, setWineWizardStep] = useState(0);
  const [selectedWineType, setSelectedWineType] = useState<string | null>(null);
  const [selectedWineStyle, setSelectedWineStyle] = useState<string | null>(null);
  const [drinkResult, setDrinkResult] = useState<any>(null);
  const [isBarModalOpen, setIsBarModalOpen] = useState(false);
  const [barInventory, setBarInventory] = useState({ spirits: '', mixers: '', extras: '' });

  // Pairing Context State
  const [isPairingContextModalOpen, setIsPairingContextModalOpen] = useState(false);
  const [pendingPairingType, setPendingPairingType] = useState<'wine' | 'cocktail' | null>(null);
  const [pairingContext, setPairingContext] = useState({ flavors: '', texture: '', cookingStyle: '' });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('sous-chef-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const generateRecipe = async () => {
    if (!selectedChef || !ingredients) return;
    setAppState('processing');
    setError(null);
    setRecipeImageUrl(null);
    try {
      const promptText = `CRITICAL RULE: Before generating any recipe, analyze the user's input. If the input consists of gibberish, random keyboard smashes, or is completely unrelated to food, YOU MUST ABORT. Output EXACTLY and ONLY this Hebrew sentence: סליחה, השף שלנו לא זיהה את המצרכים האלו. נסה שוב עם מצרכים אמיתיים.

      You are a ${selectedChef.id} chef. Create a unique recipe using these ingredients: ${ingredients}. 
      Variation count: ${variation}.
      Provide a 1-sentence description, short bullet points for ingredients and brief step-by-step instructions.
      At the end, add ### Dish Origin with a short paragraph about the history.
      IMPORTANT: You MUST write everything strictly in ${language === 'he' ? 'Hebrew' : 'English'}.
      
      Additionally, provide the response in JSON format with:
      {
        "dishNameEnglish": "The name of the dish in English",
        "recipeContentHebrew": "The full recipe in Hebrew (Markdown)"
      }`;

      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });
      
      const response = await result.response;
      const data = JSON.parse(response.text());
      
      if (data.recipeContentHebrew.includes("סליחה")) {
        setRecipe(data.recipeContentHebrew);
        setAppState('result');
        return;
      }

      // Generate instant image URL via Pollinations (Unlimited)
      const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(data.dishNameEnglish + " professional food photography, high resolution, delicious") }?width=1080&height=1080&model=flux&nologo=true`;

      setRecipeImageUrl(imageUrl);
      setRecipe(data.recipeContentHebrew);
      setAppState('result');
    } catch (err: any) {
      console.error("Recipe generation error:", err);
      setError(err.message || 'An unknown error occurred');
      setAppState('error');
    }
  };

  // ... rest of the helper functions (generateDrink, resetChef, etc.) follow your existing logic ...
