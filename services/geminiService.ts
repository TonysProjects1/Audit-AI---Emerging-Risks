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
    You are a Chief Audit Executive's AI assistant for **Northwestern Mutual**.
    Target Audience: Internal Audit Planning Committee & Risk Committee.
    Date Range: ${dateRange} (${timeFrame}).

    Company Context:
    - Structure: Major US Mutual Life Insurer & Wealth Management firm.
    - Distribution: Exclusive "Career Agency" system (Financial Representatives).
    - Products: Whole Life, Term, Disability Income (DI), Long-Term Care (LTC), Annuities, Advisory Services (NMIS).
    - Key Competitors: MassMutual, New York Life, Guardian, Prudential.

    Strategic Focus Areas:
    - Client Experience & Digital Transformation.
    - Integrated Financial Planning (Insurance + Investments).
    - Solvency & General Account Investment Performance.
  `;

  const specificInstructions = isShortTerm 
    ? `
      TASK: Search for specific, recent EVENTS that occurred strictly within this date range affecting Northwestern Mutual, its mutual peers, or the Financial Services sector.
      
      LOOK FOR:
      - Regulatory enforcement actions (SEC, FINRA, NYDFS) related to "off-channel communications", "best interest" (Reg BI), or sales practices.
      - Cybersecurity incidents involving insurers, third-party administrators (TPAs), or wealth platforms.
      - Specific negative news or lawsuits involving Northwestern Mutual or similar carrier/agency models.
      - Sudden market shifts affecting bond yields or commercial real estate (relevant to General Account).

      STYLE: News-brief style. Factual and immediate.
    `
    : `
      TASK: Analyze broad TRENDS and systemic shifts over this period relevant to Northwestern Mutual.
      
      LOOK FOR:
      - Regulatory Horizon: Department of Labor (DOL) Fiduciary Rule developments, NAIC AI/Model Governance bulletins, Tax law changes affecting estate planning.
      - Industry Trends: Shifts in "Career Agency" distribution models, direct-to-consumer competition, underwriting innovations (electronic health records).
      - Macro Risks: Commercial Mortgage Loan (CML) portfolio stress, credit cycle downturns, inflation impact on claims/expenses.
      - Emerging Tech: AI risks in financial advice, deepfakes impacting fraud verification.

      STYLE: Strategic analysis. Thematic and forward-looking.
    `;

  return `
    ${baseContext}
    ${specificInstructions}

    REQUIRED OUTPUT FORMAT (Markdown):
    For each risk found (limit to top 3-5), use this exact structure:

    ### [Risk Title]
    **Context**: [2-3 sentences explaining the event or trend]
    
    **Relevance to Northwestern Mutual**:
    *   [Why this matters: e.g., "Impacts field force compliance," "Affects whole life dividend performance," "NMIS regulatory exposure"]

    **Implications for Audit**:
    *   [Specific audit action: e.g., "Review NMIS supervisory controls," "Audit model governance for underwriting," "Assess TPA vendor management"]

    Constraints:
    - Do NOT be generic. Avoid "Cyber risks are rising." Say "SEC fines for record-keeping failures..." or "New NAIC privacy model law..."
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
