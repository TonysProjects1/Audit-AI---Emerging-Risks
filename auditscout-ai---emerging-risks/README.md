# AuditScout AI - Emerging Risk Register

An automated risk intelligence platform for audit teams. This application performs horizon scanning across 5 timeframes (Day, Week, Month, Quarter, Year) to identify emerging regulatory, operational, and technological risks.

## Features

- **Live Scanning**: Web interface to run ad-hoc risk scans using Google Gemini.
- **Automated Daily Reports**: Headless script runs every weekday at 6 AM CST via GitHub Actions.
- **GitHub Integration**: Publish reports directly to your repository as Markdown files.
- **Source Grounding**: AI results are grounded with real-world search citations.

## Setup & Installation

### 1. Local Development
```bash
npm install
export API_KEY="your_gemini_api_key"
npm run dev
```

### 2. GitHub Automation Setup
To enable the daily 6 AM scan:

1.  Go to repository **Settings** > **Secrets and variables** > **Actions**.
2.  Add `GEMINI_API_KEY` with your Google AI Studio key.
3.  Go to **Settings** > **Actions** > **General**.
4.  Under **Workflow permissions**, select **Read and write permissions** (allows the bot to save reports).

### 3. Deployment
This project is optimized for Vercel or Netlify.

1.  Import this repo into Vercel.
2.  Add `API_KEY` to the Vercel Environment Variables.
3.  Deploy.

## Project Structure
- `/src`: React frontend application.
- `/scripts`: Node.js scripts for headless automation.
- `/.github/workflows`: Configuration for daily automated scanning.
- `/reports`: (Generated) Folder where daily markdown reports are saved.
