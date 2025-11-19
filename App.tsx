import React, { useState, useCallback, useEffect } from 'react';
import { TimeFrame, RiskReportItem, GithubConfig, GenerationStatus } from './types';
import { generateRiskForTimeframe } from './services/geminiService';
import { publishReportToGithub } from './services/githubService';
import { GithubSettings } from './components/GithubSettings';
import { ReportCard } from './components/ReportCard';

const App: React.FC = () => {
  const [reports, setReports] = useState<RiskReportItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [githubConfig, setGithubConfig] = useState<GithubConfig | null>(null);
  const [genStatus, setGenStatus] = useState<GenerationStatus>({
    isGenerating: false,
    progress: 0,
    currentAction: 'Idle'
  });
  const [publishStatus, setPublishStatus] = useState<{status: 'idle' | 'success' | 'error', url?: string, message?: string}>({ status: 'idle' });

  useEffect(() => {
    const initialReports: RiskReportItem[] = Object.values(TimeFrame).map(tf => ({
      timeFrame: tf,
      content: "",
      sources: [],
      timestamp: "",
      status: 'pending'
    }));
    setReports(initialReports);

    const storedConfig = localStorage.getItem('audit_scout_gh_config');
    if (storedConfig) {
      setGithubConfig(JSON.parse(storedConfig));
    }
  }, []);

  const handleSaveGithubConfig = (config: GithubConfig) => {
    setGithubConfig(config);
    localStorage.setItem('audit_scout_gh_config', JSON.stringify(config));
  };

  const runAuditScan = useCallback(async () => {
    if (!process.env.API_KEY) {
      alert("API Key is missing from environment variables.");
      return;
    }

    setGenStatus({ isGenerating: true, progress: 5, currentAction: 'Initializing Scan...' });
    setPublishStatus({ status: 'idle' });

    const timeFrames = Object.values(TimeFrame);
    const totalSteps = timeFrames.length;
    
    setReports(prev => prev.map(r => ({ ...r, status: 'loading', content: '', sources: [] })));

    for (let i = 0; i < totalSteps; i++) {
      const tf = timeFrames[i];
      setGenStatus({ 
        isGenerating: true, 
        progress: 10 + ((i / totalSteps) * 80), 
        currentAction: `Scanning ${tf}...` 
      });

      setReports(current => current.map(r => r.timeFrame === tf ? { ...r, status: 'loading' } : r));

      // Minimal delay to allow UI to paint and prevent rate limiting
      await new Promise(r => setTimeout(r, 500));
      
      const result = await generateRiskForTimeframe(tf, process.env.API_KEY);
      setReports(current => current.map(r => r.timeFrame === tf ? result : r));
    }

    setGenStatus({ isGenerating: false, progress: 100, currentAction: 'Scan Complete' });

  }, [reports]);

  const handlePublish = async () => {
    if (!githubConfig) {
      setIsSettingsOpen(true);
      return;
    }

    const completedReports = reports.filter(r => r.status === 'completed');
    if (completedReports.length === 0) {
      alert("No completed reports to publish.");
      return;
    }

    setPublishStatus({ status: 'idle' });
    try {
      const url = await publishReportToGithub(githubConfig, completedReports);
      setPublishStatus({ status: 'success', url });
    } catch (error: any) {
      setPublishStatus({ status: 'error', message: error.message });
    }
  };

  const completedCount = reports.filter(r => r.status === 'completed').length;
  const totalCount = reports.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-40 shadow-sm/50 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 rounded-lg p-1.5 shadow-lg shadow-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <div>
               <h1 className="text-lg font-bold text-slate-900 leading-none tracking-tight">AuditScout AI</h1>
               <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Risk Intelligence Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
              onClick={() => setIsSettingsOpen(true)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${githubConfig ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200' : 'bg-slate-50 text-slate-400 hover:text-slate-600 border border-dashed border-slate-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 ${githubConfig ? 'text-indigo-500' : 'text-slate-400'}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{githubConfig ? 'GitHub Connected' : 'Connect GitHub'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Header / Controls */}
      <div className="bg-white border-b border-slate-200 px-6 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Emerging Risk Register</h2>
              <p className="text-slate-500 mt-2 text-lg leading-relaxed">
                Automated daily horizon scanning for audit teams. Detects regulatory, operational, and technological threats across 5 distinct timeframes.
              </p>
            </div>

            <div className="flex flex-col items-end gap-3 min-w-[240px]">
               {/* Action Buttons */}
               <div className="flex items-center gap-3 w-full md:w-auto">
                  {completedCount > 0 && (
                    <button
                      onClick={handlePublish}
                      disabled={genStatus.isGenerating || publishStatus.status === 'success'}
                      className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border font-medium rounded-lg transition-all ${
                        publishStatus.status === 'success' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                      }`}
                    >
                      {publishStatus.status === 'success' ? (
                         <span className="flex items-center"><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Published</span>
                      ) : (
                         <span>Publish Report</span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={runAuditScan}
                    disabled={genStatus.isGenerating}
                    className="flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:shadow-slate-900/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    {genStatus.isGenerating ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Scanning...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                        </svg>
                        New Scan
                      </span>
                    )}
                  </button>
               </div>

               {/* Status Messages */}
               {publishStatus.status === 'success' && publishStatus.url && (
                 <a href={publishStatus.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-600 hover:underline flex items-center animate-fade-in">
                   View on GitHub &rarr;
                 </a>
               )}
               {publishStatus.status === 'error' && (
                 <span className="text-xs font-medium text-red-500 animate-fade-in">
                   Error: {publishStatus.message}
                 </span>
               )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className={`mt-8 transition-all duration-500 ease-in-out ${genStatus.isGenerating ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>{genStatus.currentAction}</span>
              <span>{Math.round(genStatus.progress)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${genStatus.progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <main className="flex-grow p-6 md:p-8 lg:p-10">
        <div className="max-w-7xl mx-auto">
           {/* Grid Logic: 3 columns max to ensure readability. 3 top, 2 bottom center aligned if possible, or just standard grid. */}
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {reports.map((report) => (
                <div key={report.timeFrame} className="flex flex-col animate-slide-up">
                  <ReportCard item={report} />
                </div>
              ))}
           </div>
        </div>
      </main>

      <GithubSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleSaveGithubConfig}
        initialConfig={githubConfig}
      />
    </div>
  );
};

export default App;