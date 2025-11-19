import React, { useState, useEffect } from 'react';
import { GithubConfig } from '../types';

interface GithubSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GithubConfig) => void;
  initialConfig: GithubConfig | null;
}

export const GithubSettings: React.FC<GithubSettingsProps> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [path, setPath] = useState('risks/daily-report.md');

  useEffect(() => {
    if (initialConfig) {
      setToken(initialConfig.token);
      setOwner(initialConfig.owner);
      setRepo(initialConfig.repo);
      setPath(initialConfig.path);
    }
  }, [initialConfig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ token, owner, repo, path });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-slide-up">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">GitHub Configuration</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Personal Access Token</label>
            <input 
              type="password" 
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
              placeholder="ghp_..."
            />
            <p className="text-[11px] text-slate-400 mt-1.5">Must have <code className="bg-slate-100 px-1 rounded text-slate-600">repo</code> scope permissions.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Owner / Org</label>
              <input 
                type="text" 
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
                placeholder="e.g. acme-corp"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Repository</label>
              <input 
                type="text" 
                required
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all"
                placeholder="audit-risks"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Output File Path</label>
            <input 
              type="text" 
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all font-mono text-slate-600"
              placeholder="reports/daily-scan.md"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-50 mt-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-lg shadow-slate-900/20 transition-all transform hover:-translate-y-0.5"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};