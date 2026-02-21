import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wine, Moon, Sun, Info, RefreshCw, Check, ChevronDown } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { CHEFS } from './constants';
import { Chef, AppState } from './types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI(API_KEY);

const ChefIcon = ({ chef, className }: { chef: Chef, className?: string }) => (
  <div className={`flex items-center justify-center rounded-2xl shadow-sm ${className}`} style={{ backgroundColor: chef.bgColor }}>
    <span className="text-4xl">{chef.emoji}</span>
  </div>
);

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null);
  const [ingredients, setIngredients] = useState('');
  const [recipe, setRecipe] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);

  const generate = async () => {
    if (!selectedChef || !ingredients) return;
    setAppState('processing');
    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a ${selectedChef.id} chef. Create a recipe in Hebrew for: ${ingredients}. Return JSON: {"name": "dish name in English", "content": "Full Markdown recipe in Hebrew with a ### Dish Origin section"}`;
      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } });
      const data = JSON.parse(result.response.text());
      setImgUrl(`https://pollinations.ai/p/${encodeURIComponent(data.name)}?width=1080&height=1080&model=flux&nologo=true`);
      setRecipe(data.content);
      setAppState('result');
    } catch (err: any) { setAppState('idle'); alert("שגיאה: " + err.message); }
  };

  return (
    <div className="mobile-container font-heebo" dir="rtl">
      <header className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2"><h1 className="text-xl font-bold">Sous Chef</h1><Sparkles className="text-primary" /></div>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 bg-black/5 dark:bg-white/5 rounded-full">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      <main className="p-4 pb-20">
        <AnimatePresence mode="wait">
          {appState === 'idle' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="grid grid-cols-3 gap-3">
                {CHEFS.map(chef => (
                  <button key={chef.id} onClick={() => setSelectedChef(chef)} className={`p-4 rounded-xl border-2 transition-all ${selectedChef?.id === chef.id ? 'border-primary bg-primary/5' : 'border-transparent bg-white dark:bg-zinc-900'}`}>
                    <ChefIcon chef={chef} className="w-12 h-12 mx-auto" />
                    <span className="text-[10px] font-bold block text-center mt-2">{chef.titleHe}</span>
                  </button>
                ))}
              </div>
              <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="מה יש לך במקרר?" className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border-light dark:border-border-dark min-h-[120px] outline-none" />
              <button onClick={generate} disabled={!selectedChef || !ingredients} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg disabled:opacity-50">צור מתכון</button>
            </motion.div>
          ) : appState === 'processing' ? (
            <div className="py-20 text-center space-y-4"><div className="text-6xl animate-bounce">🍳</div><h2 className="text-2xl font-bold">השף מבשל...</h2></div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-recipe overflow-hidden border border-border-light dark:border-border-dark shadow-md">
                {imgUrl && <img src={imgUrl} className="w-full h-64 object-cover" alt="dish" />}
                <div className="p-6 markdown-content text-right text-zinc-600 dark:text-zinc-400"><Markdown>{recipe || ''}</Markdown></div>
              </div>
              <button onClick={() => { setAppState('idle'); setRecipe(null); }} className="w-full py-4 bg-black/5 dark:bg-white/5 rounded-2xl font-bold border border-border-light dark:border-border-dark">מתכון חדש</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
