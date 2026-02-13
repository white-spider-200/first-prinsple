
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DecompositionResponse, QueryAnalysisResponse, SearchMode } from "../types";

const MODEL_NAME = "gemini-3-flash-preview";
const IMAGE_MODEL_NAME = "gemini-2.5-flash-image";

const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

const MAX_RETRIES = 3;
const BASE_DELAY = 2000;

async function callWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = BASE_DELAY): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.code === 429 || (error.message && error.message.includes("429"));
    const isServerOverload = error.status === 503 || error.code === 503;

    if (retries > 0 && (isRateLimit || isServerOverload)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const decompositionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    core_concept: { type: Type.STRING },
    analogy: { type: Type.STRING },
    why_important: { type: Type.STRING },
    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          isFundamental: { type: Type.BOOLEAN },
          reasoning: { type: Type.STRING }
        },
        required: ["name", "description", "isFundamental", "reasoning"]
      }
    },
    assumptions: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["core_concept", "analogy", "why_important", "components", "assumptions"]
};

const queryAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    originalQuery: { type: Type.STRING },
    correctedQuery: { type: Type.STRING },
    intent: { type: Type.STRING, enum: ["CONCEPT", "PROBLEM", "COMPARE", "WHY"] },
    domain: { type: Type.STRING },
    isAmbiguous: { type: Type.BOOLEAN },
    ambiguityOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
    enrichment: { type: Type.STRING },
    predictedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["correctedQuery", "intent", "domain", "isAmbiguous", "enrichment", "predictedTopics"]
};

export async function analyzeUserQuery(query: string): Promise<QueryAnalysisResponse> {
  if (!ai) return { originalQuery: query, correctedQuery: query, intent: SearchMode.CONCEPT, domain: "General", isAmbiguous: false, enrichment: "Offline", predictedTopics: [] };
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze: "${query}".`,
      config: { responseMimeType: "application/json", responseSchema: queryAnalysisSchema }
    });
    return JSON.parse(response.text || "{}");
  });
}

export async function decomposeTopic(topic: string, enrichment: string, mode: SearchMode, domain: string): Promise<DecompositionResponse> {
  if (!ai) return { core_concept: "Offline", analogy: "N/A", why_important: "N/A", components: [], assumptions: [] };
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Decompose "${topic}" (First Principles). Domain: ${domain}. Enrichment: ${enrichment}.`,
      config: { responseMimeType: "application/json", responseSchema: decompositionSchema, tools: [{googleSearch: {}}] }
    });
    const parsed = JSON.parse(response.text || "{}");
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c:any) => ({ title: c.web?.title, uri: c.web?.uri })).filter((s:any) => s.uri) || [];
    return { ...parsed, sources };
  });
}

export async function verifyFundamental(componentName: string, parentContext: string): Promise<DecompositionResponse> {
  if (!ai) return { core_concept: "Offline", analogy: "N/A", why_important: "N/A", components: [], assumptions: [] };
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Verify "${componentName}" in context of "${parentContext}". Decompose further if not fundamental.`,
      config: { responseMimeType: "application/json", responseSchema: decompositionSchema, tools: [{googleSearch: {}}] }
    });
    return JSON.parse(response.text || "{}");
  });
}

export async function generateTopicImage(topic: string): Promise<string | null> {
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: { parts: [{ text: `Technical blueprint of ${topic}, teal and white lines on dark navy.` }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
  } catch { return null; }
}

export async function getElaboration(topic: string, description: string): Promise<string> {
  if (!ai) return "Offline.";
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Deep dive: "${topic}". Description: ${description}. Explain the first principles clearly.`,
    });
    return response.text || "";
  });
}

/**
 * Generates a Socratic question for a learner to test their understanding.
 */
export async function generateLearningQuestion(topic: string, description: string): Promise<string> {
    if (!ai) return "How does this work fundamentally?";
    return callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `As a Socratic teacher, generate ONE deep, thought-provoking question about the first principles of "${topic}" based on this description: "${description}". The question should test if the learner understands WHY it exists or HOW it functions at a physical/logical level, not just WHAT it is.`,
        });
        return response.text?.trim() || "What is the most irreducible truth about this concept?";
    });
}
