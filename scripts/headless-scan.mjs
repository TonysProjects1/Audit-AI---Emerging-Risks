import { GoogleGenAI } from "@google/genai";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_KEY = process.env.API_KEY;
const MODEL_NAME = "gemini-2.5-flash";
const REPORT_DIR = path.join(__dirname, '../reports');

// Timeframes to scan
const TIME_FRAMES = [
  'Past Day',
  'Past Week',
  'Past Month',
  'Past Quarter',
  'Past Year'
];

if (!API_KEY) {
  console.error("Error: API_KEY environment variable is required.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Helper to get formatted date string (YYYY-MM-DD) in Central Time (CST/CDT)
const getCentralDateString = () => {
  return new Intl.DateTimeFormat('en-CA', { // en-CA standardizes to YYYY-MM-DD
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

const getDateRange = (timeFrame) => {
  const todayStr = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  const end = new Date(todayStr);
  const start = new Date(todayStr);

  switch (timeFrame) {
    case 'Past Day': start.setDate(end.getDate() - 1); break;
    case 'Past Week': start.setDate(end.getDate() - 7); break;
    case 'Past Month': start.setMonth(end.getMonth() - 1); break;
    case 'Past Quarter': start.setMonth(end.getMonth() - 3); break;
    case 'Past Year': start.setFullYear(end.getFullYear() - 1); break;
  }
  return `from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
};

const buildPrompt = (timeFrame) => {
  const dateRange = getDateRange(timeFrame);
  const isShortTerm = timeFrame === 'Past Day' || timeFrame === 'Past Week';

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
    - Do NOT be generic. 
    - Cite real entities, laws, or events found in search.
    - If no significant specific events occurred (for Day/Week), state "No major high-impact risk events detected" but provide 1 minor observation.
  `;
};

async function generateReport() {
  console.log("Starting AuditScout AI Headless Scan...");
  
  // Ensure report directory exists
  try {
    await fs.access(REPORT_DIR);
  } catch {
    await fs.mkdir(REPORT_DIR, { recursive: true });
  }

  // Use robust Central Time string
  const dateStr = getCentralDateString();
  
  let fullReport = `# Daily Emerging Risk Register\n\n`;
  fullReport += `**Date:** ${dateStr}\n`;
  fullReport += `**Model:** ${MODEL_NAME}\n`;
  fullReport += `**Generated By:** AuditScout AI (Automated Workflow)\n\n---\n\n`;

  for (const timeFrame of TIME_FRAMES) {
    console.log(`Scanning timeframe: ${timeFrame}...`);
    
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: buildPrompt(timeFrame),
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.2,
        },
      });

      const content = response.text || "No significant risks identified.";
      
      fullReport += `## ${timeFrame}\n\n`;
      fullReport += `${content}\n\n`;

      // Add sources if available
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      if (chunks.length > 0) {
        fullReport += `**Sources:**\n`;
        chunks.forEach(chunk => {
          if (chunk.web && chunk.web.uri) {
            fullReport += `- [${chunk.web.title || 'Source'}](${chunk.web.uri})\n`;
          }
        });
      }
      fullReport += `\n---\n\n`;
      
      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`Error scanning ${timeFrame}:`, error.message);
      fullReport += `## ${timeFrame}\n\n*Error: Failed to generate scan for this timeframe.*\n\n---\n\n`;
    }
  }

  // Filename is explicitly date-based
  const filename = `risk-register-${dateStr}.md`;
  const filePath = path.join(REPORT_DIR, filename);
  
  await fs.writeFile(filePath, fullReport, 'utf-8');
  console.log(`Scan complete. Report saved to: ${filePath}`);
}

generateReport().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
