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
  const isShortTerm = timeFrame === TimeFrame.DAY || timeFrame === TimeFrame.WEEK;

  const baseContext = `
    You are a Chief Audit Executive's AI assistant.
    Target Audience: Internal Audit Planning Committee.
    Date Range: ${dateRange} (${timeFrame}).
  `;

  const specificInstructions = isShortTerm 
    ? `
      TASK: Search for specific, recent EVENTS that occurred strictly within this date range.
      
      LOOK FOR:
      - New regulatory enforcement actions or fines announced.
      - Specific cyber breaches or vulnerabilities (CVEs) released.
      - Sudden geopolitical shifts or trade announcements.
      - Corporate scandals or immediate operational disruptions.

      STYLE: News-brief style. Factual and immediate.
    `
    : `
      TASK: Analyze broad TRENDS and systemic shifts over this period.
      
      LOOK FOR:
      - Evolving regulatory themes (e.g., "increasing scrutiny on AI").
      - Statistical rises in specific types of cyber attacks (e.g., "ransomware trends").
      - Macroeconomic shifts affecting business continuity.
      - Long-term supply chain restructuring.

      STYLE: Strategic analysis. Thematic and forward-looking.
    `;

  return `
    ${baseContext}
    ${specificInstructions}

    REQUIRED OUTPUT FORMAT (Markdown):
    For each risk found (limit to top 3-5), use this exact structure:

    ### [Risk Title]
    **Context**: [2-3 sentences explaining what happened or the trend]
    
    **Implications for Audit**:
    *   [Specific audit action or area to test]
    *   [Risk impact consideration]

    Constraints:
    - Do NOT be generic. Avoid "Cybersecurity risks are rising." Say "New SEC rules on disclosure..." or "Rise in deepfake fraud..."
    - Cite real entities, laws, or events found in search.
    - If no significant specific events occurred (for Day/Week), state "No major high-impact risk events detected" but provide 1 minor observation.
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
      model: "gemini-2.5-flash",
      contents: buildPrompt(timeFrame),
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2, // Low temp for high factual accuracy
      },
    });

    const content = response.text || "No content generated.";
    
    // Map SDK GroundingChunk to application GroundingChunk type
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
