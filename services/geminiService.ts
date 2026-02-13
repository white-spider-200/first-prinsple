import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DecompositionResponse, QueryAnalysisResponse, SearchMode } from "../types";

const MODEL_NAME = "gemini-3-flash-preview";
const IMAGE_MODEL_NAME = "gemini-2.5-flash-image";

// Initialize AI safely - if API_KEY is missing, we rely solely on fallbacks
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

// --- RETRY LOGIC ---
const MAX_RETRIES = 3;
const BASE_DELAY = 2000; // Start with 2 seconds

async function callWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = BASE_DELAY): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for rate limit (429) or service unavailable (503)
    const isRateLimit = error.status === 429 || error.code === 429 || (error.message && error.message.includes("429"));
    const isServerOverload = error.status === 503 || error.code === 503;

    if (retries > 0 && (isRateLimit || isServerOverload)) {
      console.warn(`Gemini API Busy/RateLimited. Retrying in ${delay}ms... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const decompositionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    core_concept: { 
      type: Type.STRING, 
      description: "A First Principles definition based on the provided context. What is this physically? Describe the material/energy/information reality." 
    },
    analogy: { 
      type: Type.STRING, 
      description: "A mechanical or engineering analogy that clarifies the function (e.g., 'Like a pump', 'Like a capacitor')." 
    },
    why_important: {
      type: Type.STRING, 
      description: "The fundamental utility. How does this increase efficiency, reduce cost, or enable new physics?" 
    },
    components: {
      type: Type.ARRAY,
      description: "The irreducible components or constraints found in the text.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Direct, descriptive name." },
          description: { type: Type.STRING, description: "What is its physical function?" },
          isFundamental: { type: Type.BOOLEAN, description: "TRUE only if it is a Law of Physics, Math, or Raw Material. FALSE if it is a human process, design choice, or convention." },
          reasoning: { type: Type.STRING, description: "Why is this required by physics/logic?" }
        },
        required: ["name", "description", "isFundamental", "reasoning"]
      }
    },
    assumptions: {
      type: Type.ARRAY,
      description: "Identify 3-4 'Social Truths' or conventions mentioned or implied in the text that limit current thinking.",
      items: { type: Type.STRING }
    }
  },
  required: ["core_concept", "analogy", "why_important", "components", "assumptions"]
};

const queryAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    originalQuery: { type: Type.STRING },
    correctedQuery: { type: Type.STRING, description: "Corrected spelling and grammar." },
    intent: { type: Type.STRING, enum: ["CONCEPT", "PROBLEM", "COMPARE", "WHY"] },
    domain: { type: Type.STRING, description: "The field of study (Physics, Engineering, Economics, etc.)." },
    isAmbiguous: { type: Type.BOOLEAN, description: "True if multiple meanings exist." },
    ambiguityOptions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "If ambiguous, list 3 distinct options." 
    },
    enrichment: { type: Type.STRING, description: "Guidance to strip away convention and focus on physics/economics." },
    predictedTopics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-4 sub-components likely to be part of the breakdown."
    }
  },
  required: ["correctedQuery", "intent", "domain", "isAmbiguous", "enrichment", "predictedTopics"]
};

// --- FALLBACK MOCKS ---
const getFallbackAnalysis = (query: string): QueryAnalysisResponse => ({
  originalQuery: query,
  correctedQuery: query,
  intent: SearchMode.CONCEPT,
  domain: "General",
  isAmbiguous: false,
  enrichment: "Basic analysis (Offline)",
  predictedTopics: ["Overview", "Details"],
  dataSource: 'FALLBACK'
});

const getFallbackDecomposition = (topic: string): DecompositionResponse => ({
  core_concept: `${topic} (Offline Mode)`,
  analogy: "System offline",
  why_important: "Cannot retrieve importance without AI",
  components: [
      { name: "Component 1", description: "Placeholder data", isFundamental: false, reasoning: "Offline" },
      { name: "Component 2", description: "Placeholder data", isFundamental: false, reasoning: "Offline" }
  ],
  assumptions: ["Data is offline"],
  sources: [],
  dataSource: 'FALLBACK'
});

// --- EXPORTED FUNCTIONS ---

export async function analyzeUserQuery(query: string): Promise<QueryAnalysisResponse> {
  if (!ai) return getFallbackAnalysis(query);

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze this user query for a first-principles decomposition engine: "${query}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: queryAnalysisSchema,
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return { ...JSON.parse(text), dataSource: 'AI' };
  });
}

export async function decomposeTopic(topic: string, enrichment: string, mode: SearchMode, domain: string): Promise<DecompositionResponse> {
  if (!ai) return getFallbackDecomposition(topic);

  return callWithRetry(async () => {
    const prompt = `
      Perform a rigorous First Principles Decomposition on the topic: "${topic}".
      Context/Domain: ${domain}.
      Enrichment Guide: ${enrichment}.
      Search Mode: ${mode}.
      
      Break this down into its most basic physical or logical components. 
      Identify what is a fundamental constraint (Physics/Math) vs what is a design choice (Convention/Human).
      
      CRITICAL: Return unique, distinct components. Do not list the main topic itself as a component. 
      Ensure siblings are not duplicates of each other.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: decompositionSchema,
        tools: [{googleSearch: {}}], // Enable search for grounding
        temperature: 0.3
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    
    // Deduplication Logic
    const uniqueComponents: any[] = [];
    const seen = new Set<string>();
    const rootTopic = topic.toLowerCase().trim();

    if (parsed.components && Array.isArray(parsed.components)) {
        for (const comp of parsed.components) {
            const name = comp.name?.trim();
            if (!name) continue;
            const key = name.toLowerCase();
            
            // Filter duplicates (same name as sibling) and self-references (same name as parent)
            if (!seen.has(key) && key !== rootTopic) {
                seen.add(key);
                uniqueComponents.push(comp);
            }
        }
        parsed.components = uniqueComponents;
    }
    
    // Extract grounding sources
    const sources: Array<{title: string; uri: string}> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { ...parsed, sources, dataSource: 'AI' };
  });
}

export async function verifyFundamental(componentName: string, parentContext: string): Promise<DecompositionResponse> {
  if (!ai) return getFallbackDecomposition(componentName);

  return callWithRetry(async () => {
    const prompt = `
      Analyze the component "${componentName}" within the context of "${parentContext}".
      Is this a fundamental building block (Law of Physics, Raw Material, Mathematical Truth) or can it be decomposed further?
      If it is not fundamental, break it down. If it is fundamental, explain why in the reasoning.
      
      CRITICAL: If breaking it down, return unique distinct sub-components. 
      Do not list "${componentName}" itself as a sub-component.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: decompositionSchema,
        tools: [{googleSearch: {}}],
        temperature: 0.2
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);

    // Deduplication Logic
    const uniqueComponents: any[] = [];
    const seen = new Set<string>();
    const currentTopic = componentName.toLowerCase().trim();

    if (parsed.components && Array.isArray(parsed.components)) {
        for (const comp of parsed.components) {
            const name = comp.name?.trim();
            if (!name) continue;
            const key = name.toLowerCase();
            
            if (!seen.has(key) && key !== currentTopic) {
                seen.add(key);
                uniqueComponents.push(comp);
            }
        }
        parsed.components = uniqueComponents;
    }

    // Extract grounding sources
    const sources: Array<{title: string; uri: string}> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { ...parsed, sources, dataSource: 'AI' };
  });
}

export async function generateTopicImage(topic: string): Promise<string | null> {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: `A clean, schematic, blueprint-style conceptual illustration of ${topic}. Minimalist, technical, high contrast, teal and white lines on dark background.` }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    return null;
  } catch (e) {
    console.warn("Image generation failed", e);
    return null;
  }
}

export async function getElaboration(topic: string, description: string): Promise<string> {
  if (!ai) return "Elaboration unavailable in offline mode.";

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Provide a detailed, first-principles explanation of "${topic}". 
      Context: ${description}. 
      Explain the 'Why' and 'How' deeply. Focus on the mechanics, physics, or underlying logic. 
      Keep it under 300 words but make it dense with insight.`,
    });
    
    return response.text || "No elaboration available.";
  });
}