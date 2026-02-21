import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wine, GlassWater, Sun, Moon, Info, RefreshCw, Check, ChevronDown, X, Utensils, Thermometer } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { CHEFS, WINE_TYPES, WINE_STYLES } from './constants';
import { Chef, AppState, Tab } from './types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI(API_KEY);

const ChefIcon = ({ chef, className }: { chef: Chef, className?: string }) => (
  <div className={`flex items-center justify-center rounded-2xl shadow-sm transition-all ${className}`} style={{ backgroundColor: chef.bgColor }}>
    <span className="text-4xl">{chef.emoji}</span>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chef');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null);
  const [ingredients, setIngredients] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [recipeImageUrl, setRecipeImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drinkResult, setDrinkResult] = useState<any>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const generateRecipe = async () => {
    if (!selectedChef || !ingredients) return;
    setAppState('processing');
    setError(null);
    try {
      const prompt = `You are a ${selectedChef.id} chef. Create a recipe using: ${ingredients}. Return JSON: {"dishName": "name in English", "content": "recipe in Hebrew Markdown with ### Dish Origin section"}`;
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } });
      const data = JSON.parse(result.response.text());
      setRecipeImageUrl(`https://pollinations.ai/p/${encodeURIComponent(data.dishName)}?width=1080&height=1080&model=flux&nologo=true`);
      setRecipe(data.content);
      setAppState('result');
    } catch (err: any) { setAppState('error'); setError(err.message); }
  };

  const generateDrink = async () => {
    setAppState('processing');
    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`Suggest one drink to pair with this: ${recipe}. Write in Hebrew.`);
      setDrinkResult(result.response.text());
      setAppState('result');
    } catch (err: any) { setAppState('idle'); }
  };

  return (
    <div className="mobile-container font-heebo" dir="rtl">
      <header className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center">
        <h1 className="text-xl font-bold">Sous Chef 🍳</h1>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 bg-black/5 dark:bg-white/5 rounded-full">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      <main className="p-4">
        <AnimatePresence mode="wait">
          {appState === 'idle' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {CHEFS.map(chef => (
                  <button key={chef.id} onClick={() => setSelectedChef(chef)} className={`p-4 rounded-xl border-2 transition-all ${selectedChef?.id === chef.id ? 'border-primary' : 'border-transparent bg-white dark:bg-zinc-900'}`}>
                    <ChefIcon chef={chef} className="w-12 h-12 mx-auto" />
                    <span className="text-[10px] font-bold block text-center mt-2">{chef.titleHe}</span>
                  </button>
                ))}
              </div>
              <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="מה יש במקרר?" className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border border-border-light dark:border-border-dark min-h-[100px]" />
              <button onClick={generateRecipe} className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg">צור מתכון</button>
            </motion.div>
          ) : appState === 'processing' ? (
            <div className="py-20 text-center animate-pulse">🕒 השף מבשל...</div>
          ) : appState === 'result' ? (
            <div className="space-y-6">
              {recipeImageUrl && <img src={recipeImageUrl} className="w-full rounded-2xl shadow-lg" alt="dish" />}
              <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-border-light dark:border-border-dark markdown-content">
                <Markdown>{recipe || drinkResult}</Markdown>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!drinkResult && <button onClick={generateDrink} className="py-3 bg-primary text-white rounded-xl font-bold">התאם משקה 🍷</button>}
                <button onClick={() => { setAppState('idle'); setRecipe(null); setDrinkResult(null); }} className="py-3 bg-black/5 dark:bg-white/5 rounded-xl font-bold">התחל מחדש</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">❌ שגיאה: {error} <button onClick={() => setAppState('idle')} className="block mx-auto mt-4 text-primary">חזור</button></div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
