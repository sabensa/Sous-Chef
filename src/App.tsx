import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wine, GlassWater, Sun, Moon, Clock, Info, RefreshCw, Check, ChevronDown, ChevronLeft, Thermometer, X, Utensils, Cake, Soup, Flame, Fish, Leaf } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';
import { CHEFS, WINE_TYPES, WINE_STYLES } from './constants';
import { Chef, Recipe, Wine as WineType, Cocktail, AppState, BartenderState, Tab } from './types';

// Hardcoded API key for prototype as requested
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
  const [recipeImageBase64, setRecipeImageBase64] = useState<string | null>(null);
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
    setRecipeImageBase64(null);
    try {
      const promptText = `CRITICAL RULE: Before generating any recipe, analyze the user's input. If the input consists of gibberish, random keyboard smashes (like "asdfg" or "דגכדגכ"), or is completely unrelated to food and cooking, YOU MUST ABORT the recipe generation entirely. In such cases, output EXACTLY and ONLY this Hebrew sentence: סליחה, השף שלנו לא זיהה את המצרכים האלו. נסה שוב עם מצרכים אמיתיים. Do not output any Markdown structure, do not output a title, and do not explain yourself. Just output that exact sentence.

      You are a ${selectedChef.id} chef. Create a unique recipe using these ingredients: ${ingredients}. 
      Variation count: ${variation}.
      Be highly concise. Do not write long paragraphs. 
      Provide only a 1-sentence description, followed by clear, short bullet points for ingredients and very brief step-by-step instructions.
      At the very end of your response, add a section called ### Dish Origin with a short paragraph about the history and cultural origin of this dish.
      Return the response in a clear, readable Markdown format.
      IMPORTANT: You MUST write your entire response, including the title, ingredients, instructions, and history, strictly in ${language === 'he' ? 'Hebrew' : 'English'}.
      
      Additionally, provide the response in JSON format with the following structure:
      {
        "dishNameEnglish": "The name of the dish in English",
        "recipeContentHebrew": "The full recipe in Hebrew (Markdown)"
      }`;

      console.log('Calling Gemini API for recipe using @google/genai...');
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash", // תוקן כאן למודל יציב
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dishNameEnglish: { type: Type.STRING },
              recipeContentHebrew: { type: Type.STRING }
            },
            required: ["dishNameEnglish", "recipeContentHebrew"]
          }
        }
      });
      
      const data = JSON.parse(result.text || "{}");
      
      if (data.recipeContentHebrew === "סליחה, השף שלנו לא זיהה את המצרכים האלו. נסה שוב עם מצרכים אמיתיים.") {
        setRecipe(data.recipeContentHebrew);
        setAppState('result');
        return;
      }

      console.log('Generating image for:', data.dishNameEnglish);
      
      // תוקן כאן: שימוש ב-URL חינמי ויציב כדי למנוע את השגיאות שרת והמכסה של גוגל
      const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(data.dishNameEnglish + " high quality professional food photography")}?width=1080&height=1080&model=flux&nologo=true`;
      
      setRecipeImageBase64(imageUrl);
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
      const { type, dishDescription, barInventory, wineType, wineStyle, pairingContext, useRecipe } = params;
      const drinkLabel = type === 'wine' ? 'יין' : 'קוקטייל';
      
      let promptText = "";

      if (recipe && useRecipe) {
        promptText = `The user is about to eat this dish: \n\n${recipe}\n\nAct as an expert Sommelier/Mixologist. Suggest EXACTLY ONE specific ${drinkLabel} pairing for the dish. DO NOT provide a list of options. Give me just ONE perfect, ultimate recommendation. Format: Name of the drink in bold, followed by a short explanation of why it pairs perfectly. IMPORTANT: Write strictly in ${language === 'he' ? 'Hebrew' : 'English'}.`;
      } else if (type === "wine") {
        let contextStr = "";
        if (pairingContext) {
          contextStr = ` The dish has the following characteristics: Flavors: ${pairingContext.flavors}, Texture: ${pairingContext.texture}, Cooking Style: ${pairingContext.cookingStyle}.`;
        }
        
        if (pairingContext || dishDescription) {
          promptText = `Act as an expert Sommelier. Suggest EXACTLY ONE specific wine pairing for this dish${dishDescription ? ': ' + dishDescription : ''}.${contextStr} DO NOT provide a list of options. Format: Name of the wine in bold, followed by a short explanation. IMPORTANT: Write strictly in ${language === 'he' ? 'Hebrew' : 'English'}.`;
        } else {
          promptText = `Act as an expert Sommelier. Suggest EXACTLY ONE specific ${wineType} wine with a ${wineStyle} style. DO NOT provide a list of options. Format: Name of the wine in bold, followed by a short explanation. IMPORTANT: Write strictly in ${language === 'he' ? 'Hebrew' : 'English'}.`;
        }
      } else {
        let contextStr = "";
        if (pairingContext || dishDescription) {
          contextStr = ` This cocktail should pair well with a dish that has these characteristics: ${dishDescription ? 'Name: ' + dishDescription + ', ' : ''}${pairingContext ? 'Flavors: ' + pairingContext.flavors + ', Texture: ' + pairingContext.texture + ', Cooking Style: ' + pairingContext.cookingStyle : ''}.`;
        }
        promptText = `Act as an expert Mixologist. Create EXACTLY ONE specific cocktail recipe${barInventory ? ' using these ingredients: ' + barInventory : ''}. ${contextStr} DO NOT provide a list of options. Format: Name of the cocktail in bold, followed by ingredients and instructions. IMPORTANT: Write strictly in ${language === 'he' ? 'Hebrew' : 'English'}.`;
      }

      console.log('Calling Gemini API for drink using @google/genai...');
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash", // תוקן כאן למודל יציב
        contents: promptText
      });
      const text = result.text;
      
      console.log('API Response received:', text);
      setDrinkResult(text);
      setBartenderState('result');
    } catch (err: any) {
      console.error("Drink generation error:", err);
      setError(err.message || 'An unknown error occurred');
      setBartenderState('idle');
    }
  };

  const resetChef = () => {
    setAppState('idle');
    setRecipe(null);
    setVariation(0);
  };

  const resetBartender = () => {
    setBartenderState('idle');
    setDrinkResult(null);
    setWineWizardStep(0);
    setSelectedWineType(null);
    setSelectedWineStyle(null);
    setSelectedDrinkType(null);
  };

  return (
    <div className="mobile-container font-heebo" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="w-10" /> {/* Spacer */}
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
              <button 
                onClick={() => setActiveTab('chef')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${activeTab === 'chef' ? 'bg-white dark:bg-zinc-800 shadow-sm font-bold' : 'text-text-muted'}`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{language === 'he' ? 'שף' : 'Chef'}</span>
              </button>
              <button 
                onClick={() => setActiveTab('bartender')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${activeTab === 'bartender' ? 'bg-white dark:bg-zinc-800 shadow-sm font-bold' : 'text-text-muted'}`}
              >
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
                selectedChef={selectedChef} 
                setSelectedChef={setSelectedChef}
                ingredients={ingredients}
                setIngredients={setIngredients}
                recipe={recipe}
                recipeImageBase64={recipeImageBase64}
                onGenerate={generateRecipe}
                onReset={resetChef}
                onPairDrink={(type: any) => {
                  setSelectedDrinkType(type === 'wine' ? 'יין' : 'קוקטייל');
                  if (recipe) {
                    setActiveTab('bartender');
                    generateDrink({ type, useRecipe: true });
                  } else {
                    setPendingPairingType(type);
                    setIsPairingContextModalOpen(true);
                  }
                }}
                onAnotherRecipe={() => {
                  setVariation(v => v + 1);
                  generateRecipe();
                }}
                error={error}
                language={language}
              />
            ) : (
            <BartenderMode 
              state={bartenderState}
              wizardStep={wineWizardStep}
              setWizardStep={setWineWizardStep}
              selectedWineType={selectedWineType}
              setSelectedWineType={setSelectedWineType}
              selectedWineStyle={selectedWineStyle}
              setSelectedWineStyle={setSelectedWineStyle}
              drinkResult={drinkResult}
              selectedDrinkType={selectedDrinkType}
              setSelectedDrinkType={setSelectedDrinkType}
              onGenerateWine={() => generateDrink({ type: 'wine', wineType: selectedWineType, wineStyle: selectedWineStyle })}
              onOpenBarModal={() => setIsBarModalOpen(true)}
              onPairWithDish={() => {
                if (recipe) {
                  generateDrink({ type: selectedDrinkType === 'יין' ? 'wine' : 'cocktail', useRecipe: true });
                } else {
                  setPendingPairingType(selectedDrinkType === 'יין' ? 'wine' : 'cocktail');
                  setIsPairingContextModalOpen(true);
                }
              }}
              onReset={resetBartender}
              language={language}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Fixed Generate Button for Chef Idle */}
      {activeTab === 'chef' && appState === 'idle' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-light dark:from-bg-dark to-transparent pt-10 pointer-events-none">
          <div className="max-w-[420px] mx-auto pointer-events-auto">
            <button 
              onClick={generateRecipe}
              disabled={!selectedChef || !ingredients.trim()}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{language === 'he' ? 'צור מתכון' : 'Generate Recipe'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Fixed Generate Button for Bartender Idle */}
      {activeTab === 'bartender' && bartenderState === 'idle' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-bg-light dark:from-bg-dark to-transparent pt-10 pointer-events-none">
          <div className="max-w-[420px] mx-auto pointer-events-auto">
            <button 
              onClick={() => {
                if (selectedDrinkType === 'יין') setWineWizardStep(1);
                else if (selectedDrinkType === 'קוקטייל') setIsBarModalOpen(true);
              }}
              disabled={!selectedDrinkType}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{language === 'he' ? 'התאם משקה' : 'Generate Pairing'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bar Inventory Modal */}
      <BarInventoryModal 
        isOpen={isBarModalOpen} 
        onClose={() => setIsBarModalOpen(false)}
        inventory={barInventory}
        setInventory={setBarInventory}
        onGenerate={() => {
          setIsBarModalOpen(false);
          generateDrink({ 
            type: 'cocktail', 
            barInventory: `Spirits: ${barInventory.spirits}. Mixers: ${barInventory.mixers}. Extras: ${barInventory.extras}`,
            pairingContext
          });
        }}
      />

      {/* Pairing Context Modal */}
      <PairingContextModal 
        isOpen={isPairingContextModalOpen}
        onClose={() => setIsPairingContextModalOpen(false)}
        context={pairingContext}
        setContext={setPairingContext}
        onConfirm={() => {
          setIsPairingContextModalOpen(false);
          if (pendingPairingType === 'wine') {
            generateDrink({ 
              type: 'wine', 
              pairingContext
            });
          } else {
            setIsBarModalOpen(true);
          }
        }}
      />
    </div>
  );
}

function ChefMode({ state, selectedChef, setSelectedChef, ingredients, setIngredients, recipe, recipeImageBase64, onGenerate, onReset, onPairDrink, onAnotherRecipe, error, language }: any) {
  const t = {
    he: {
      selectChef: 'בחר שף',
      selectStyle: 'בחר סגנון',
      ingredients: 'מה יש לך במקרר?',
      addIngredients: 'הוסף מרכיבים',
      placeholder: 'למשל: עוף, בצל, שום, עגבניות, אורז...',
      loading: 'השף שלנו בדרך אליך...',
      preparing: 'מכין לך מתכון מושלם',
      generate: 'צור מתכון',
      somethingWrong: 'משהו השתבש',
      tryAgain: 'נסה שוב'
    },
    en: {
      selectChef: 'Choose your chef',
      selectStyle: 'Select Style',
      ingredients: "What's in your fridge?",
      addIngredients: 'Add Ingredients',
      placeholder: 'e.g. chicken, onion, garlic, tomatoes, rice...',
      loading: 'Our chef is on the way...',
      preparing: 'Preparing a perfect recipe for you',
      generate: 'Generate Recipe',
      somethingWrong: 'Something went wrong',
      tryAgain: 'Try again'
    }
  }[language as 'he' | 'en'];

  if (state === 'idle') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
        <section>
          <div className="mb-4">
            <span className="text-xs text-text-muted uppercase tracking-wider">{t.selectStyle}</span>
            <h2 className="text-2xl font-bold">{t.selectChef}</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {CHEFS.map(chef => (
              <button 
                key={chef.id}
                onClick={() => setSelectedChef(chef)}
                className={`relative p-4 rounded-chef border-2 transition-all flex flex-col items-center justify-center gap-3 ${selectedChef?.id === chef.id ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark bg-white dark:bg-zinc-900'}`}
              >
                <div className={`transition-all ${selectedChef?.id === chef.id ? 'scale-110' : 'opacity-90'}`}>
                  <ChefIcon chef={chef} className="w-16 h-16" />
                </div>
                <span className="text-[10px] font-bold block text-center leading-tight">{language === 'he' ? chef.titleHe : chef.title}</span>
                {selectedChef?.id === chef.id && (
                  <div className="absolute top-2 right-2 bg-primary text-white p-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <span className="text-xs text-text-muted uppercase tracking-wider">{t.addIngredients}</span>
            <h2 className="text-2xl font-bold">{t.ingredients}</h2>
          </div>
          <textarea 
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder={t.placeholder}
            dir="auto"
            className="w-full min-h-[120px] p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-border-light dark:border-border-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
          />
        </section>
      </motion.div>
    );
  }

  if (state === 'processing') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 flex items-center justify-center bg-primary/10 rounded-full animate-simmer">
            <span className="text-6xl">🍳</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2 animate-text-pulse text-zinc-800 dark:text-zinc-100">{t.loading}</h2>
        <p className="text-text-muted italic">{t.preparing}</p>
        <div className="flex gap-1.5 mt-6">
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot [animation-delay:0.2s]" />
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot [animation-delay:0.4s]" />
        </div>
      </motion.div>
    );
  }

  if (state === 'result' && recipe) {
    return <RecipeDisplay recipe={recipe} imageBase64={recipeImageBase64} onPairDrink={onPairDrink} onAnotherRecipe={onAnotherRecipe} onReset={onReset} language={language} />;
  }

  if (state === 'error') {
    return (
      <div className="text-center py-20">
        <span className="text-6xl mb-6 block">😅</span>
        <h2 className="text-2xl font-bold mb-2">{t.somethingWrong}</h2>
        <div className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 p-4 rounded-xl mb-8 text-left overflow-auto max-h-[200px] font-mono text-xs">
          {error}
        </div>
        <button onClick={onReset} className="px-8 py-3 bg-primary text-white rounded-xl font-bold">{t.tryAgain}</button>
      </div>
    );
  }

  return null;
}

function RecipeDisplay({ recipe, imageBase64, onPairDrink, onAnotherRecipe, onReset, language }: { recipe: any, imageBase64: string | null, onPairDrink: (type: 'wine' | 'cocktail') => void, onAnotherRecipe: () => void, onReset: () => void, language: 'he' | 'en' }) {
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isOriginExpanded, setIsOriginExpanded] = useState(false);

  const t = {
    he: {
      pairDrink: 'התאם משקה',
      wineRecommendation: 'המלצת יין',
      cocktailFromBar: 'קוקטייל מהבר',
      anotherRecipe: 'מתכון אחר',
      startOver: 'התחל מחדש',
      discoverOrigin: 'גלה את מקור המנה',
      aiWarning: 'מתכונים אלו נוצרו על ידי בינה מלאכותית. יש לבדוק את המרכיבים והוראות ההכנה לפני השימוש.'
    },
    en: {
      pairDrink: 'Pair a Drink',
      wineRecommendation: 'Wine Recommendation',
      cocktailFromBar: 'Cocktail from Bar',
      anotherRecipe: 'Another Recipe',
      startOver: 'Start Over',
      discoverOrigin: 'Discover Dish Origin',
      aiWarning: 'These recipes are AI-generated. Please verify ingredients and instructions before use.'
    }
  }[language];

  if (typeof recipe === 'string') {
    const formattedRecipe = recipe.replace(/\\n/g, '\n');
    
    const parts = formattedRecipe.split(/### Dish Origin/i);
    const mainRecipe = parts[0];
    const originContent = parts[1] ? parts[1].trim() : null;

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-recipe overflow-hidden shadow-card border border-border-light dark:border-border-dark">
          {imageBase64 && (
            <div className="relative h-64 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <img 
                // תוקן כאן: המערכת תדע לזהות אם זו תמונה רגילה (URL) או תמונת שרת (base64)
                src={imageBase64.startsWith('http') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`} 
                alt="Dish"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
          <div className="p-8" dir={language === 'he' ? 'rtl' : 'ltr'}>
            <div className={`markdown-content font-sans text-base leading-relaxed text-zinc-600 dark:text-zinc-400 ${language === 'he' ? 'text-right' : 'text-left'}`}>
              <Markdown
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">{children}</h1>,
                  img: ({ src, alt }) => (
                    <div className="mb-8 -mx-8 sm:mx-0">
                      <img 
                        src={src} 
                        alt={alt} 
                        className="w-full h-auto sm:rounded-2xl shadow-lg object-cover max-h-[400px]"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ),
                  h2: ({ children }) => <h2 className="text-xl font-bold text-zinc-900 dark:text-white mt-8 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-6 mb-3">{children}</h3>,
                  p: ({ children }) => <p className="mb-4">{children}</p>,
                  ul: ({ children }) => <ul className={`list-disc ${language === 'he' ? 'pr-5' : 'pl-5'} mb-6 space-y-2`}>{children}</ul>,
                  ol: ({ children }) => <ol className={`list-decimal ${language === 'he' ? 'pr-5' : 'pl-5'} mb-6 space-y-2`}>{children}</ol>,
                  li: ({ children }) => <li className={language === 'he' ? 'pr-1' : 'pl-1'}>{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-zinc-900 dark:text-white">{children}</strong>,
                  em: ({ children }) => <em className="italic text-zinc-500 dark:text-zinc-500">{children}</em>,
                }}
              >
                {mainRecipe}
              </Markdown>
            </div>

            {originContent && (
              <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark">
                <button 
                  onClick={() => setIsOriginExpanded(!isOriginExpanded)}
                  className="flex items-center gap-2 text-primary font-bold text-sm hover:opacity-80 transition-opacity"
                >
                  <Info className="w-4 h-4" />
                  <span>{t.discoverOrigin}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOriginExpanded ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isOriginExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-sm italic text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {originContent}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsPairingOpen(!isPairingOpen)}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
            >
              <span>{t.pairDrink}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {isPairingOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden z-10"
                >
                  <button 
                    onClick={() => { onPairDrink('wine'); setIsPairingOpen(false); }}
                    className={`w-full px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between ${language === 'he' ? 'text-right' : 'text-left'}`}
                  >
                    <span>{t.wineRecommendation}</span>
                    <Wine className="w-4 h-4 text-primary" />
                  </button>
                  <button 
                    onClick={() => { onPairDrink('cocktail'); setIsPairingOpen(false); }}
                    className={`w-full px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 border-t border-border-light dark:border-border-dark flex items-center justify-between ${language === 'he' ? 'text-right' : 'text-left'}`}
                  >
                    <span>{t.cocktailFromBar}</span>
                    <GlassWater className="w-4 h-4 text-primary" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={onAnotherRecipe} className="w-full py-3 bg-black/5 dark:bg-white/5 rounded-xl font-bold flex items-center justify-center gap-2 border border-border-light dark:border-border-dark">
            <RefreshCw className="w-4 h-4" />
            <span>{t.anotherRecipe}</span>
          </button>
        </div>
        <button onClick={onReset} className="w-full py-3 text-text-muted font-medium hover:text-primary transition-colors">
          {t.startOver}
        </button>
        <p className="text-[10px] text-center text-text-muted px-4">
          {t.aiWarning}
        </p>
      </motion.div>
    );
  }
  return null;
}

function BartenderMode({ state, wizardStep, setWizardStep, selectedWineType, setSelectedWineType, selectedWineStyle, setSelectedWineStyle, drinkResult, selectedDrinkType, setSelectedDrinkType, onGenerateWine, onOpenBarModal, onPairWithDish, onReset, language }: any) {
  const t = {
    he: {
      title: 'מה נשתה?',
      subtitle: 'בחר סוג משקה ואני אכין לך משהו מושלם',
      wine: 'יין',
      cocktail: 'קוקטייל',
      wineRecommendation: 'המלצת יין',
      wineSubtitle: 'ספר לי מה במצב רוח ואמליץ לך',
      cocktailFromBar: 'קוקטייל מהבר',
      cocktailSubtitle: 'ספר לי מה יש לך ואני אכין משהו',
      pairWithDish: 'התאם למנה',
      pairWithDishSubtitle: 'ספר לי על המנה ואתאים לך משקה',
      chooseType: 'בחר את סוג המשקה:',
      generate: 'התאם משקה',
      loading: 'הסומלייה בוחר...',
      startOver: 'התחל מחדש'
    },
    en: {
      title: 'What to drink?',
      subtitle: 'Choose a drink type and I will prepare something perfect',
      wine: 'Wine',
      cocktail: 'Cocktail',
      wineRecommendation: 'Wine Recommendation',
      wineSubtitle: 'Tell me what you are in the mood for',
      cocktailFromBar: 'Cocktail from Bar',
      cocktailSubtitle: "Tell me what you have and I'll make something",
      pairWithDish: 'Pair with a Dish',
      pairWithDishSubtitle: 'Tell me about the dish and I will pair a drink',
      chooseType: 'Choose drink type:',
      generate: 'Generate Pairing',
      loading: 'The Sommelier is choosing...',
      startOver: 'Start Over'
    }
  }[language as 'he' | 'en'];

  if (state === 'idle') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t.title}</h2>
          <p className="text-text-muted">{t.subtitle}</p>
        </div>

        <div className="text-center mb-4">
          <p className="text-sm font-bold text-primary">{t.chooseType}</p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button 
            onClick={() => setSelectedDrinkType('יין')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${selectedDrinkType === 'יין' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-zinc-900 border-border-light dark:border-border-dark text-text-muted'}`}
          >
            {t.wine}
          </button>
          <button 
            onClick={() => setSelectedDrinkType('קוקטייל')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${selectedDrinkType === 'קוקטייל' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-zinc-900 border-border-light dark:border-border-dark text-text-muted'}`}
          >
            {t.cocktail}
          </button>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onPairWithDish}
            disabled={!selectedDrinkType}
            className={`w-full p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-border-light dark:border-border-dark ${language === 'he' ? 'text-right' : 'text-left'} flex items-center gap-4 shadow-sm hover:border-primary transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border-light`}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
              <Utensils className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{t.pairWithDish}</h3>
              <p className="text-sm text-text-muted">{t.pairWithDishSubtitle}</p>
            </div>
          </button>

          {selectedDrinkType === 'יין' ? (
            <button 
              onClick={() => setWizardStep(1)}
              className={`w-full p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-border-light dark:border-border-dark ${language === 'he' ? 'text-right' : 'text-left'} flex items-center gap-4 shadow-sm hover:border-primary transition-all group`}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Wine className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{t.wineRecommendation}</h3>
                <p className="text-sm text-text-muted">{t.wineSubtitle}</p>
              </div>
            </button>
          ) : selectedDrinkType === 'קוקטייל' ? (
            <button 
              onClick={onOpenBarModal}
              className={`w-full p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-border-light dark:border-border-dark ${language === 'he' ? 'text-right' : 'text-left'} flex items-center gap-4 shadow-sm hover:border-primary transition-all group`}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <GlassWater className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{t.cocktailFromBar}</h3>
                <p className="text-sm text-text-muted">{t.cocktailSubtitle}</p>
              </div>
            </button>
          ) : (
            <div className="p-8 border-2 border-dashed border-border-light dark:border-border-dark rounded-2xl text-center text-text-muted">
              <p className="text-sm italic">{t.chooseType}</p>
            </div>
          )}
        </div>

        {wizardStep > 0 && (
          <WineWizard 
            step={wizardStep} 
            setStep={setWizardStep} 
            selectedType={selectedWineType}
            setSelectedType={setSelectedWineType}
            selectedStyle={selectedWineStyle}
            setSelectedStyle={setSelectedWineStyle}
            onGenerate={onGenerateWine}
            onClose={() => setWizardStep(0)}
          />
        )}
      </motion.div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 flex items-center justify-center bg-primary/10 rounded-full animate-simmer">
            <span className="text-6xl">{selectedDrinkType === 'יין' ? '🍷' : '🍸'}</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2 animate-text-pulse text-zinc-800 dark:text-zinc-100">{t.loading}</h2>
        <div className="flex gap-1.5 mt-6">
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot [animation-delay:0.2s]" />
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  if (state === 'result' && drinkResult) {
    return <DrinkDisplay drink={drinkResult} onReset={onReset} language={language} drinkType={selectedDrinkType} />;
  }

  return null;
}

function WineWizard({ step, setStep, selectedType, setSelectedType, selectedStyle, setSelectedStyle, onGenerate, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[60] bg-bg-light dark:bg-bg-dark p-4 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
          <X className="w-6 h-6" />
        </button>
        <div className="flex gap-2">
          <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-primary' : 'bg-border-light dark:bg-border-dark'}`} />
          <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-primary' : 'bg-border-light dark:bg-border-dark'}`} />
        </div>
        <div className="w-10" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <div className="mb-8">
              <span className="text-xs text-text-muted uppercase tracking-wider">מה במצב רוח?</span>
              <h2 className="text-2xl font-bold">בחר את סוג היין שבא לך עכשיו</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {WINE_TYPES.map(type => (
                <button 
                  key={type.id}
                  onClick={() => { setSelectedType(type.id); setStep(2); }}
                  className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-border-light dark:border-border-dark flex flex-col items-center gap-3 shadow-sm active:scale-95 transition-all"
                >
                  <span className="text-4xl">{type.emoji}</span>
                  <span className="font-bold">{type.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
            <div className="mb-8">
              <span className="text-xs text-text-muted uppercase tracking-wider">מה הוויב שלך?</span>
              <h2 className="text-2xl font-bold">בחר את הסגנון המועדף עליך</h2>
            </div>
            <div className="space-y-3">
              {selectedType && WINE_STYLES[selectedType].map(style => (
                <button 
                  key={style.id}
                  onClick={() => { setSelectedStyle(style.id); onGenerate(); }}
                  className="w-full p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-border-light dark:border-border-dark text-right font-bold shadow-sm active:scale-95 transition-all flex items-center justify-between"
                >
                  <ChevronLeft className="w-5 h-5 text-primary" />
                  <span>{style.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-8 w-full py-3 text-text-muted font-medium">חזרה לבחירת סוג</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BarInventoryModal({ isOpen, onClose, inventory, setInventory, onGenerate }: any) {
  if (!isOpen) return null;

  const isAnyFieldFilled = inventory.spirits.trim() || inventory.mixers.trim() || inventory.extras.trim();

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        className="w-full max-w-[420px] bg-bg-light dark:bg-bg-dark rounded-t-3xl p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">מלאי הבר שלך</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted mb-2 uppercase">משקאות חריפים</label>
            <input 
              value={inventory.spirits}
              onChange={(e) => setInventory({ ...inventory, spirits: e.target.value })}
              placeholder="וודקה, ג'ין, רום, טקילה, וויסקי..."
              className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted mb-2 uppercase">מיקסרים ומיצים</label>
            <input 
              value={inventory.mixers}
              onChange={(e) => setInventory({ ...inventory, mixers: e.target.value })}
              placeholder="סודה, טוניק, מיץ לימון, מיץ תפוזים..."
              className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted mb-2 uppercase">תוספות וקישוטים</label>
            <input 
              value={inventory.extras}
              onChange={(e) => setInventory({ ...inventory, extras: e.target.value })}
              placeholder="קרח, לימון, ליים, מנטה, דובדבנים..."
              className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <button 
          onClick={onGenerate}
          disabled={!isAnyFieldFilled}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all active:scale-95"
        >
          תכין לי קוקטייל!
        </button>
      </motion.div>
    </div>
  );
}

function PairingContextModal({ isOpen, onClose, context, setContext, onConfirm }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        className="w-full max-w-[420px] bg-bg-light dark:bg-bg-dark rounded-t-3xl p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">ספר לי עוד על המנה</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-text-muted">כדי שנוכל להתאים את המשקה המושלם, כדאי להוסיף כמה פרטים על המנה:</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted mb-2 uppercase">טעמים דומיננטיים</label>
            <input 
              value={context.flavors}
              onChange={(e) => setContext({ ...context, flavors: e.target.value })}
              placeholder="חריף, מלוח, מתוק, חמוץ..."
              className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted mb-2 uppercase">מרקם</label>
            <input 
              value={context.texture}
              onChange={(e) => setContext({ ...context, texture: e.target.value })}
              placeholder="קרמי, פריך, רך, לעיס..."
              className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted mb-2 uppercase">שיטת בישול</label>
            <input 
              value={context.cookingStyle}
              onChange={(e) => setContext({ ...context, cookingStyle: e.target.value })}
              placeholder="צלוי, אפוי, מטוגן, מאודה..."
              className="w-full p-4 rounded-xl bg-black/5 dark:bg-white/5 border-none outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <button 
          onClick={onConfirm}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95"
        >
          המשך להתאמה
        </button>
      </motion.div>
    </div>
  );
}

function DrinkDisplay({ drink, onReset, language, drinkType }: { drink: any, onReset: () => void, language: 'he' | 'en', drinkType: 'יין' | 'קוקטייל' }) {
  const isWine = drinkType === 'יין';
  const [showTip, setShowTip] = useState(false);

  const drinkImage = isWine 
    ? "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80"
    : "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80";

  const t = {
    he: {
      startOver: 'התחל מחדש',
      close: 'סגור',
      aiWarning: 'המלצה זו נוצרה על ידי בינה מלאכותית.'
    },
    en: {
      startOver: 'Start Over',
      close: 'Close',
      aiWarning: 'This recommendation is AI-generated.'
    }
  }[language];

  if (typeof drink === 'string') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-recipe overflow-hidden shadow-card border border-border-light dark:border-border-dark">
          <div className="h-48 relative">
            <img 
              src={drinkImage} 
              alt={drinkType}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <div className="p-8">
            <div className={`markdown-content font-sans text-sm leading-[1.6] text-zinc-600 dark:text-zinc-400 ${language === 'he' ? 'text-right' : 'text-left'}`} dir={language === 'he' ? 'rtl' : 'ltr'}>
              <Markdown
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold text-zinc-900 dark:text-white mt-6 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="mb-4">{children}</p>,
                  ul: ({ children }) => <ul className={`list-disc ${language === 'he' ? 'pr-5' : 'pl-5'} mb-4 space-y-1`}>{children}</ul>,
                  ol: ({ children }) => <ol className={`list-decimal ${language === 'he' ? 'pr-5' : 'pl-5'} mb-4 space-y-1`}>{children}</ol>,
                  li: ({ children }) => <li className={language === 'he' ? 'pr-1' : 'pl-1'}>{children}</li>,
                  strong: ({ children }) => <strong className="font-bold text-zinc-900 dark:text-white">{children}</strong>,
                  em: ({ children }) => <em className="italic text-zinc-500 dark:text-zinc-500">{children}</em>,
                }}
              >
                {drink}
              </Markdown>
            </div>
          </div>
        </div>
        <button onClick={onReset} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95">
          {t.startOver}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-recipe p-6 shadow-card border border-border-light dark:border-border-dark">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {isWine ? <Wine className="w-7 h-7" /> : <GlassWater className="w-7 h-7" />}
          </div>
          <div>
            <h2 className="text-xl font-bold">{drink.nameHe}</h2>
            <p className="text-sm text-text-muted">{isWine ? drink.typeHe : drink.descriptionHe}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl">
            <span className="text-[10px] text-text-muted uppercase font-bold block mb-1">{isWine ? 'אזור' : 'כוס'}</span>
            <span className="text-sm font-bold">{isWine ? drink.regionHe : drink.glassHe}</span>
          </div>
          <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl">
            <span className="text-[10px] text-text-muted uppercase font-bold block mb-1">{isWine ? 'זני ענבים' : 'קישוט'}</span>
            <span className="text-sm font-bold">{isWine ? drink.grapesHe : drink.garnishHe}</span>
          </div>
        </div>

        {!isWine && (
          <div className="space-y-8 mb-8">
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                מרכיבים
              </h3>
              <ul className="space-y-2">
                {drink.ingredientsHe?.map((ing: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                הוראות הכנה
              </h3>
              <div className="space-y-4">
                {drink.instructionsHe?.map((step: string, i: number) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {isWine && (
          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3">למה זה מתאים?</h3>
            <p className="text-sm leading-relaxed text-text-muted">{drink.descriptionHe}</p>
          </section>
        )}

        {isWine && (
          <section className="pt-4 border-t border-border-light dark:border-border-dark">
            <button 
              onClick={() => setShowTip(!showTip)}
              className="flex items-center justify-between w-full text-sm font-medium text-text-muted"
            >
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                <span>טיפ הגשה</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showTip ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showTip && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="pt-4 text-sm text-text-muted leading-relaxed italic">{drink.servingTipHe}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>

      <button onClick={onReset} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg">סגור</button>
      <p className="text-[10px] text-center text-text-muted px-4">המלצה זו נוצרה על ידי בינה מלאכותית.</p>
    </motion.div>
  );
}
