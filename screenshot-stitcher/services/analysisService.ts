import { GoogleGenAI, Type } from "@google/genai";
import { type AnalysisResult } from "../types";

// The API key is injected from the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

export const analyzeImageSet = async (files: File[]): Promise<AnalysisResult> => {
  if (files.length < 2) {
    return { issues: [], commonHeaderHeight: 0 };
  }

  const imageParts = await Promise.all(
    files.map(async (file) => {
      const base64Data = await fileToBase64(file);
      return {
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      };
    })
  );

  const promptText = `You are an expert quality assurance agent analyzing a set of screenshots that a user wants to stitch together vertically. Your task is to identify potential problems and suggest optimizations.

Analyze the ordered list of screenshots for three things:

1.  **GAP**: A visual discontinuity between the bottom of one image and the top of the next. This means some content is likely missing.
2.  **SIMILARITY**: Two consecutive images are effectively duplicates (more than 98% visually identical). This can include minor changes like a moved cursor or a pop-up modal. Do NOT flag images that have a natural, partial overlap from standard scrolling.
3.  **COMMON HEADER**: Detect if there is a visually identical header/banner present at the top of ALL images. If so, measure its height in pixels. This header must be consistent across every single image.

Return a JSON object with:
1.  "issues": A list of all GAP or SIMILARITY problems. If none, return an empty array.
2.  "commonHeaderHeight": An integer for the height of a common header found across ALL images. If not detected, this MUST be 0.`;

  const contents = [{ text: promptText }, ...imageParts];

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      issues: {
        type: Type.ARRAY,
        description: "A list of issues found between consecutive images.",
        items: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: ["GAP", "SIMILARITY"],
            },
            indices: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
            },
            reason: {
              type: Type.STRING,
            },
          },
          required: ["type", "indices", "reason"],
        },
      },
      commonHeaderHeight: {
        type: Type.INTEGER,
        description: "The height in pixels of a common header found at the top of all images. 0 if no common header is detected."
      }
    },
     required: ["issues", "commonHeaderHeight"],
  };
  
  try {
     const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contents },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("Analysis returned an empty response.");
    }

    const result = JSON.parse(jsonText);
    return {
        issues: result.issues || [],
        commonHeaderHeight: result.commonHeaderHeight || 0,
    };

  } catch (error) {
      console.error("Error during Gemini API call:", error);
      throw new Error("Failed to analyze images. The AI model may be temporarily unavailable.");
  }
};