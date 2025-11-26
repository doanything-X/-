import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCreativeCaption = async (imageBase64: string): Promise<string> => {
  try {
    const ai = getClient();
    
    // Clean the base64 string if it contains data URI header
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          },
          {
            text: "Look at this photo and write a very short, handwritten-style caption (max 5-8 words). It should sound fun, nostalgic, or witty, like a memory scribbled on a Polaroid. It can be in English or Chinese depending on the photo's vibe. Do NOT use quotes. Do NOT use hashtags."
          }
        ]
      },
      config: {
          temperature: 0.8 // Slightly higher creativity for witty captions
      }
    });

    return response.text?.trim() || "Moments like this...";
  } catch (error) {
    console.error("Gemini Caption Error:", error);
    // Return a safe fallback if AI fails so the app doesn't break
    return "Good vibes only";
  }
};
