import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DecompositionResponse } from "../types";

// Using the recommended model for text reasoning
const MODEL_NAME = "gemini-3-flash-preview";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    components: {
      type: Type.ARRAY,
      description: "List of essential sub-components or functional parts.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Short, functional name of the component." },
          description: { type: Type.STRING, description: "Brief explanation of its role." },
          isFundamental: { type: Type.BOOLEAN, description: "True if this cannot be reasonably broken down further in this context." },
          reasoning: { type: Type.STRING, description: "Why is this a component or why is it fundamental?" }
        },
        required: ["name", "description", "isFundamental", "reasoning"]
      }
    },
    assumptions: {
      type: Type.ARRAY,
      description: "List of implicit assumptions (technical, human, economic) behind the parent topic.",
      items: { type: Type.STRING }
    }
  },
  required: ["components", "assumptions"]
};

export const decomposeTopic = async (topic: string, context?: string): Promise<DecompositionResponse> => {
  try {
    const prompt = `
      You are a First-Principles Reasoning Engine.
      Analyze the following topic: "${topic}".
      ${context ? `Context: ${context}` : ''}

      Task:
      1. Decompose this topic into 3-6 essential functional components.
      2. Identify hidden assumptions required for this topic to exist or function.
      3. Determine if any of the components are "Fundamental Principles" (cannot be reduced further meaningfully).

      Rules:
      - Be strictly analytical. No metaphors.
      - Ensure components are mutually exclusive and collectively exhaustive where possible.
      - If a component is a physical law, human nature, or basic math, mark it as Fundamental.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for consistent logic
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as DecompositionResponse;

  } catch (error) {
    console.error("Gemini Decomposition Error:", error);
    throw error;
  }
};

export const verifyFundamental = async (topic: string, parentContext: string): Promise<DecompositionResponse> => {
   // Re-using the same structure but tailored for deep verification
   try {
    const prompt = `
      Analyze the specific concept: "${topic}" which is a part of "${parentContext}".

      Is "${topic}" a fundamental principle (atomic unit)?
      
      - If YES: Return it as a single component with 'isFundamental': true, and explain why.
      - If NO: Break it down further into sub-components.

      Also list specific assumptions related to "${topic}".
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as DecompositionResponse;

  } catch (error) {
    console.error("Gemini Verification Error:", error);
    throw error;
  }
}