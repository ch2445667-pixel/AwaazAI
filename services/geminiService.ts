
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { Voice, SpeakerConfig } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-preview-tts';

export async function generateTTSAudio(
  text: string,
  style: string,
  voice: Voice,
  speed: number,
  pitch: number
): Promise<string | undefined> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Create a natural language instruction for speed and pitch
  const speedText = speed === 1.0 ? "" : `at ${speed}x speed`;
  const pitchText = pitch > 2 ? "with a very high pitch" : 
                    pitch > 0 ? "with a high pitch" :
                    pitch < -2 ? "with a very deep voice" :
                    pitch < 0 ? "with a deep voice" : "";
  
  const instructionParts = [speedText, pitchText, style].filter(Boolean);
  const instruction = instructionParts.length > 0 
    ? `(Instruction: Speak ${instructionParts.join(", ")}) ` 
    : "";

  const prompt = `${instruction}${text}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
}

export async function generateMultiTTSAudio(
  dialogue: string,
  speakers: SpeakerConfig[],
  speed: number,
  pitch: number
): Promise<string | undefined> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const speedText = speed === 1.0 ? "" : `at ${speed}x speed`;
  const pitchText = pitch > 0 ? "with higher pitch" : pitch < 0 ? "with deeper pitch" : "";
  const instruction = (speedText || pitchText) ? `(Global Instruction: Speak ${[speedText, pitchText].filter(Boolean).join(" and ")})\n\n` : "";

  const prompt = `${instruction}${dialogue}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: speakers.map(s => ({
              speaker: s.name,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: s.voice }
              }
            }))
          }
        }
      }
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Gemini Multi-TTS Error:", error);
    throw error;
  }
}
