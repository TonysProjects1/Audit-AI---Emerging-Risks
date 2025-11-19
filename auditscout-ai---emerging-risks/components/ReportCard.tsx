import React from 'react';
import ReactMarkdown from 'react-markdown';
import { RiskReportItem } from '../types';

interface ReportCardProps {
  item: RiskReportItem;
}

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
    <div className="space-y-2">
      <div className="h-3 bg-slate-100 rounded"></div>
      <div className="h-3 bg-slate-100 rounded w-5/6"></div>
      <div className="h-3 bg-slate-100 rounded w-4/6"></div>
    </div>
    <div className="pt-4 space-y-2">
      <div className="h-3 bg-slate-100 rounded"></div>
      <div className="h-3 bg-slate-100 rounded w-11/12"></div>
    </div>
  </div>
);

export const ReportCard: React.FC<ReportCardProps> = ({ item }) => {
  const isError = item.status === 'error';
  const isLoading = item.status === 'loading';
  const isPending = item.status === 'pending';
  const isCompleted = item.status === 'completed';

  // Determine border color based on status
  const borderColor = isError ? 'border-red-200' : isCompleted ? 'border-slate-200' : 'border-transparent';
  const shadowClass = isCompleted ? 'shadow-sm hover:shadow-xl hover:-translate-y-1' : 'shadow-none';

  return (
    <div className={`bg-white rounded-2xl border ${borderColor} ${shadowClass} p-0 h-full flex flex-col transition-all duration-300 overflow-hidden relative group`}>
      
      {/* Header Section */}
      <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center relative">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">{item.timeFrame}</h3>
          {!isPending && !isLoading && (
            <p className="text-xs text-slate-400 mt-0.5 font-mono">Scan: {new Date(item.timestamp).toLocaleDateString()}</p>
          )}
        </div>
        
        {/* Status Badge */}
        <div className="flex-shrink-0">
          {isPending && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wide">Pending</span>}
          {isLoading && <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wide flex items-center"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-1.5 animate-ping"></span>Analyzing</span>}
          {isCompleted && <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold uppercase tracking-wide flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>Ready</span>}
          {isError && <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold uppercase tracking-wide">Failed</span>}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-6 flex-grow flex flex-col relative">
        {isPending && (
          <div className="flex-grow flex items-center justify-center opacity-40 min-h-[200px]">
            <div className="text-center">
               <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
               </svg>
               <p className="text-sm text-slate-400">Waiting to start scan...</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="min-h-[200px]">
             <SkeletonLoader />
             <div className="mt-8"><SkeletonLoader /></div>
          </div>
        )}

        {isError && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
            <p className="font-bold mb-1">Error generating report</p>
            <p>{item.error}</p>
          </div>
        )}

        {isCompleted && (
          <div className="prose prose-sm prose-slate max-w-none prose-headings:font-bold prose-h3:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Footer / Sources */}
      {item.sources.length > 0 && (
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 text-sm">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
            <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Cited Sources
          </h4>
          <div className="flex flex-wrap gap-2">
            {item.sources.map((source, idx) => (
              source.web && (
                <a 
                  key={idx}
                  href={source.web.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all max-w-full truncate"
                  title={source.web.title}
                >
                  <span className="truncate max-w-[200px]">{source.web.title || new URL(source.web.uri).hostname}</span>
                </a>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};