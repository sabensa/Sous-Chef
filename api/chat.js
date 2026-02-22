import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const config = req.body.isJson ? { responseMimeType: "application/json" } : {};

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: req.body.prompt,
      config: config
    });

    res.status(200).json({ text: response.text });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: error.message || 'Server Error' });
  }
}
