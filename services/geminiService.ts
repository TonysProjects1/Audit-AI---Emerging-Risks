import { GoogleGenAI } from "@google/genai";
import { TimeFrame, RiskReportItem } from "../types";

const getDateRange = (timeFrame: TimeFrame): string => {
  const end = new Date();
  const start = new Date();

  switch (timeFrame) {
    case TimeFrame.DAY:
      start.setDate(end.getDate() - 1);
      break;
    case TimeFrame.WEEK:
      start.setDate(end.getDate() - 7);
      break;
    case TimeFrame.MONTH:
      start.setMonth(end.getMonth() - 1);
      break;
    case TimeFrame.QUARTER:
      start.setMonth(end.getMonth() - 3);
      break;
    case TimeFrame.YEAR:
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return `from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
};

const buildPrompt = (timeFrame: TimeFrame): string => {
  const dateRange = getDateRange(timeFrame);
  
  return `
    You are a senior risk analyst for a corporate audit team.
    
    Task: Identify and summarize the top 3-5 emerging risks relevant to internal audit planning during the period: ${dateRange} (${timeFrame}).
    
    Focus Areas:
    - Regulatory changes (Global and Major Markets)
    - Cybersecurity and Technology (AI, Data Privacy)
    - Economic and Financial Stability
    - Operational and Supply Chain Disruptions
    
    Output Format:
    - Provide a concise executive summary title for each risk.
    - Follow with a short paragraph explaining the risk and its potential impact on an organization.
    - Keep the tone professional, objective, and action-oriented.
    - Do NOT invent risks. Only report on information found via the search tool.
  `;
};

export const generateRiskForTimeframe = async (
  timeFrame: TimeFrame,
  apiKey: string
): Promise<RiskReportItem> => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: buildPrompt(timeFrame),
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3, // Lower temperature for more factual reporting
      },
    });

    const content = response.text || "No content generated.";
    
    // Map SDK GroundingChunk to application GroundingChunk type to fix compatibility
    const rawSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = rawSources.map(chunk => ({
      web: (chunk.web && chunk.web.uri) ? {
        uri: chunk.web.uri,
        title: chunk.web.title || ""
      } : undefined
    }));

    return {
      timeFrame,
      content,
      sources,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

  } catch (error: any) {
    console.error(`Error generating report for ${timeFrame}:`, error);
    return {
      timeFrame,
      content: "",
      sources: [],
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message || "Unknown error occurred"
    };
  }
};
