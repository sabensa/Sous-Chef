import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Moon, Sun, RefreshCw, Info } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { CHEFS } from './constants';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI(API_KEY);

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [chef, setChef] = useState(CHEFS[0]);
  const [ing, setIng] = useState('');
  const [recipe, setRecipe] = useState('');
  const [img, setImg] = useState('');

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);

  const generate = async () => {
    if (!ing) return;
    setState('busy');
    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a ${chef.id} chef. Create a recipe in Hebrew for: ${ing}. Return JSON ONLY: {"name": "dish name in English", "content": "Full Hebrew Markdown recipe with ### Dish Origin"}`;
      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } });
      const data = JSON.parse(result.response.text());
      setImg(`https://pollinations.ai/p/${encodeURIComponent(data.name)}?width=1080&height=1080&model=flux&nologo=true`);
      setRecipe(data.content);
      setState('done');
    } catch (e: any) { setState('idle'); alert("Error: " + e.message); }
  };

  return (
    <div className="max-w-[420px] mx-auto min-h-screen bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark font-heebo p-4" dir="rtl">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold flex items-center gap-2">Sous Chef <Sparkles className="text-primary" /></h1>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 bg-black/5 dark:bg-white/5 rounded-full">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      {state === 'idle' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {CHEFS.map(c => (
              <button key={c.id} onClick={() => setChef(c)} className={`p-2 rounded-xl border-2 transition-all ${chef.id === c.id ? 'border-primary bg-primary/5' : 'border-transparent bg-white dark:bg-zinc-900'}`}>
                <div className="text-3xl mb-1">{c.emoji}</div>
                <div className="text-[10px] font-bold">{c.titleHe}</div>
              </button>
            ))}
          </div>
          <textarea value={ing} onChange={e => setIng(e.target.value)} placeholder="מה יש במקרר?" className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border border-border-light dark:border-border-dark min-h-[120px]" />
          <button onClick={generate} className="w-full py-4 bg-primary text-white rounded-xl font-bold">צור מתכון</button>
        </div>
      ) : state === 'busy' ? (
        <div className="py-20 text-center animate-bounce text-4xl">🍳</div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-border-light dark:border-border-dark shadow-md">
            {img && <img src={img} className="w-full h-64 object-cover" alt="food" />}
            <div className="p-6 markdown-content"><Markdown>{recipe}</Markdown></div>
          </div>
          <button onClick={() => setState('idle')} className="w-full py-4 bg-black/5 dark:bg-white/5 rounded-xl font-bold border border-border-light dark:border-border-dark flex items-center justify-center gap-2">
            <RefreshCw size={18} /> מתכון חדש
          </button>
        </div>
      )}
    </div>
  );
}
