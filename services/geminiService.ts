
import { GoogleGenAI } from "@google/genai";
import { Language, Product } from "../types";

export const getAIResponse = async (
  product: Product,
  userQuestion: string,
  lang: Language
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const productName = product.name[lang];
    const productDesc = product.description[lang];

    const prompt = `You are a helpful customer support agent for "Party accessoires verhuur", a high-end party rental shop.
    The customer is asking about the following product:
    Name: ${productName}
    Description: ${productDesc}
    Price: ${product.price} EUR

    The customer asked: "${userQuestion}"

    Please provide a helpful, polite, and concise answer in ${
      lang === 'nl' ? 'Dutch' : lang === 'pl' ? 'Polish' : 'English'
    }. Focus on encouraging the rental.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return response.text || "I'm sorry, I couldn't process your request right now.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Error connecting to AI service.";
  }
};
