import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wine, GlassWater, Sun, Moon, Clock, Info, RefreshCw, Check, ChevronDown, ChevronLeft, Thermometer, X, Utensils, Cake, Soup, Flame, Fish, Leaf } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';
import { CHEFS, WINE_TYPES, WINE_STYLES } from './constants';
import { Chef, Recipe, Wine as WineType, Cocktail, AppState, BartenderState, Tab } from './types';

// Safe API key retrieval from Vercel/Vite environment
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI(API_KEY);

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
      const promptText = `CRITICAL RULE: Before generating any recipe, analyze the user's input. If the input consists of gibberish, random keyboard smashes (like "asdfg" or "דגכדגכ"), or is completely unrelated to food and cooking, YOU MUST ABORT the recipe generation entirely. In such cases, output EXACTLY and ONLY this Hebrew sentence: סליחה, השף שלנו לא זיהה את המצרכים האלו. נסה שוב עם מצרכים אמיתיים. Do not output any Markdown structure, do not output a title, and do not explain yourself. Just output that exact sentence.

      You are a ${selectedChef.id} chef. Create a unique recipe using these ingredients: ${ingredients}. 
      Variation count: ${variation}.
      Be highly concise. Do not write long paragraphs. 
      Provide only a 1-sentence description, followed by clear, short bullet points for ingredients and very brief step-by-step instructions.
      At the very end of your response, add a section called ### Dish Origin with a short paragraph about the history and cultural origin of this dish.
      Return the response in a clear, readable Markdown format.
      IMPORTANT: You MUST write your entire response strictly in ${language === 'he' ? 'Hebrew' : 'English'}.
      
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

      // Fast, Unlimited image generation via Pollinations
      const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(data.dishNameEnglish + " professional food photography, high resolution, gourmet dish") }?width=1080&height=1080&model=flux&nologo=true`;

      setRecipeImageUrl(imageUrl);
      setRecipe(data.recipeContentHebrew);
      setAppState('result');
    } catch (err: any) {
      console.error("Recipe generation error:", err);
      setError(err.message || 'An unknown error occurred');
      setAppState('error');
    }
  };

  const generateDrink = async (params: any) => {
    setBartenderState('processing');
    setError(null);
    try {
      const { type, barInventory, wineType, wineStyle, pairingContext, useRecipe } = params;
      const drinkLabel = type === 'wine' ? 'יין' : 'קוקטייל';
      
      let promptText = "";
      if (recipe && useRecipe) {
        promptText = `The user is about to eat this dish: \n\n${recipe}\n\nAct as an expert Sommelier/Mixologist. Suggest EXACTLY ONE specific ${drinkLabel} pairing for the dish. Format: Name of the drink in bold, followed by a short explanation. Write strictly in ${language === 'he' ? 'Hebrew' : 'English'}.`;
      } else if (type === "wine") {
        promptText = `Act as an expert Sommelier. Suggest EXACTLY ONE specific ${wineType} wine with a ${wineStyle} style. Write strictly in ${language === 'he' ? 'Hebrew' : 'English'}.`;
      } else {
        promptText = `Act as an expert Mixologist. Create EXACTLY ONE cocktail using: ${barInventory || 'any typical ingredients'}. Write strictly in ${language === 'he' ? 'Hebrew' : 'English'}.`;
      }

      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(promptText);
      const response = await result.response;
      setDrinkResult(response.text());
      setBartenderState('result');
    } catch (err: any) {
      console.error("Drink generation error:", err);
      setError(err.message || 'An unknown error occurred');
      setBartenderState('idle');
    }
  };

  const resetChef = () => { setAppState('idle'); setRecipe(null); setVariation(0); };
  const resetBartender = () => { setBartenderState('idle'); setDrinkResult(null); setWineWizardStep(0); };

  return (
    <div className="mobile-container font-heebo" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="w-10" />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Sous Chef</h1>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="px-4 pb-3">
          <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
              <button onClick={() => setActiveTab('chef')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${activeTab === 'chef' ? 'bg-white dark:bg-zinc-800 shadow-sm font-bold' : 'text-text-muted'}`}>
                <Sparkles className="w-4 h-4" />
                <span>{language === 'he' ? 'שף' : 'Chef'}</span>
              </button>
              <button onClick={() => setActiveTab('bartender')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${activeTab === 'bartender' ? 'bg-white dark:bg-zinc-800 shadow-sm font-bold' : 'text-text-muted'}`}>
                <Wine className="w-4 h-4" />
                <span>{language === 'he' ? 'ברמן' : 'Bartender'}</span>
              </button>
          </div>
        </div>
      </header>

      <main className="p-4 pb-32">
        <AnimatePresence mode="wait">
            {activeTab === 'chef' ? (
              <ChefMode 
                state={appState} 
                selectedChef={selectedChef} setSelectedChef={setSelectedChef}
                ingredients={ingredients} setIngredients={setIngredients}
                recipe={recipe} recipeImageUrl={recipeImageUrl}
                onGenerate={generateRecipe} onReset={resetChef}
                onPairDrink={(type: any) => { setSelectedDrinkType(type === 'wine' ? 'יין' : 'קוקטייל'); setActiveTab('bartender'); generateDrink({ type, useRecipe: true }); }}
                onAnotherRecipe={() => { setVariation(v => v + 1); generateRecipe(); }}
                error={error} language={language}
              />
            ) : (
            <BartenderMode 
              state={bartenderState} wizardStep={wineWizardStep} setWizardStep={setWineWizardStep}
              drinkResult={drinkResult} selectedDrinkType={selectedDrinkType} setSelectedDrinkType={setSelectedDrinkType}
              onGenerateWine={() => generateDrink({ type: 'wine', wineType: selectedWineType, wineStyle: selectedWineStyle })}
              onOpenBarModal={() => setIsBarModalOpen(true)}
              onReset
