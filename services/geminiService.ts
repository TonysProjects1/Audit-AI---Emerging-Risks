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
    You are a Chief Audit Executive's AI assistant for a **Large Mutual Life Insurance and Wealth Management Company**.
    Target Audience: Internal Audit Planning Committee & Risk Committee.
    Date Range: ${dateRange} (${timeFrame}).

    Context: The company offers Life Insurance, Annuities, Disability Income, and Wealth Management/Investment products.
    Key Concerns: Solvency, Policyholder Protection, Regulatory Compliance (NAIC/SEC/DOL), Interest Rate Risk, and Digital Transformation.
  `;

  const specificInstructions = isShortTerm 
    ? `
      TASK: Search for specific, recent EVENTS that occurred strictly within this date range affecting the Insurance & Financial Services sector.
      
      LOOK FOR:
      - New regulatory enforcement actions (SEC, FINRA, State Insurance Depts) or fines against insurers.
      - Specific cyber breaches in financial services or third-party TPAs.
      - Sudden market shocks affecting asset management or yield curves.
      - Immediate operational disruptions or competitor scandals (e.g., sales practice violations).

      STYLE: News-brief style. Factual and immediate.
    `
    : `
      TASK: Analyze broad TRENDS and systemic shifts over this period relevant to Life Insurance & Wealth.
      
      LOOK FOR:
      - Evolving regulatory themes (e.g., DOL Fiduciary Rule, NAIC AI Model Bulletin, Privacy laws).
      - Emerging Actuarial/Underwriting risks (e.g., mortality trends, climate impact on health, genetic testing laws).
      - Macroeconomic shifts affecting investment income, annuities, and capital requirements.
      - Technology risks: AI bias in underwriting, legacy system modernization challenges.

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
    *   [Specific audit action: e.g., "Review model governance," "Test TPA controls," "Assess liquidity stress testing"]
    *   [Impact consideration: e.g., "Reputational risk," "Regulatory fine exposure"]

    Constraints:
    - Do NOT be generic. Avoid "Cyber risks are rising." Say "New NYDFS cybersecurity amendment..." or "Rise in annuity fraud..."
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
