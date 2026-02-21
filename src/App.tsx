import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { CHEFS } from './constants';

const ai = new GoogleGenAI(import.meta.env.VITE_GEMINI_API_KEY);

export default function App() {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [chef, setChef] = useState(CHEFS[0]);
  const [ing, setIng] = useState('');
  const [recipe, setRecipe] = useState('');
  const [img, setImg] = useState('');

  const generate = async () => {
    if (!ing) return;
    setState('busy');
    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a ${chef.id} chef. Recipe in Hebrew for: ${ing}. Return JSON ONLY: {"name": "dish name in English", "content": "Full Hebrew Markdown recipe with ### Dish Origin"}`;
      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, ''));
      setImg(`https://pollinations.ai/p/${encodeURIComponent(data.name)}?width=1080&height=1080&model=flux&nologo=true`);
      setRecipe(data.content);
      setState('done');
    } catch (e: any) { setState('idle'); alert("Error: " + e.message); }
  };

  return (
    <div className="max-w-[420px] mx-auto min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4" dir="rtl">
      <header className="flex justify-between items-center mb-8 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm">
        <h1 className="text-xl font-bold flex items-center gap-2">Sous Chef <Sparkles className="text-orange-500" /></h1>
      </header>

      {state === 'idle' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {CHEFS.map(c => (
              <button key={c.id} onClick={() => setChef(c)} className={`p-2 rounded-xl border-2 transition-all ${chef.id === c.id ? 'border-orange-500 bg-orange-50' : 'border-transparent bg-white dark:bg-zinc-900'}`}>
                <div className="text-3xl mb-1">{c.emoji}</div>
                <div className="text-[10px] font-bold">{c.titleHe}</div>
              </button>
            ))}
          </div>
          <textarea value={ing} onChange={e => setIng(e.target.value)} placeholder="מה יש במקרר?" className="w-full p-4 rounded-xl bg-white dark:bg-zinc-900 border outline-none min-h-[120px]" />
          <button onClick={generate} className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold">צור מתכון</button>
        </div>
      ) : state === 'busy' ? (
        <div className="py-20 text-center animate-bounce text-4xl">🍳</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border shadow-md">
            {img && <img src={img} className="w-full h-64 object-cover" alt="food" />}
            <div className="p-6 text-right"><Markdown>{recipe}</Markdown></div>
          </div>
          <button onClick={() => setState('idle')} className="w-full py-4 bg-zinc-200 dark:bg-zinc-800 rounded-xl font-bold flex items-center justify-center gap-2">
            <RefreshCw size={18} /> מתכון חדש
          </button>
        </div>
      )}
    </div>
  );
}
