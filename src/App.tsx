import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { CHEFS } from './constants';

const ai = new GoogleGenAI(import.meta.env.VITE_GEMINI_API_KEY);

export default function App() {
  const [recipe, setRecipe] = useState('');
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const res = await model.generateContent("תן לי מתכון קצר לחביתה בפורמט מרקדאון");
      setRecipe(res.response.text());
    } catch (e) { alert("מפתח API לא תקין ב-Vercel"); }
    setLoading(false);
  };

  return (
    <div className="p-10 text-center font-sans" dir="rtl">
      <h1 className="text-3xl font-bold mb-5">השף של סער מוכן! 👨‍🍳</h1>
      <button onClick={start} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold">
        {loading ? "מבשל..." : "בדיקת מערכת - צור מתכון"}
      </button>
      {recipe && <div className="mt-10 p-5 border rounded-xl text-right bg-white shadow-sm"><Markdown>{recipe}</Markdown></div>}
    </div>
  );
}
