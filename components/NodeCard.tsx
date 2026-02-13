import React from 'react';
import { NodeData, NodeType } from '../types';

interface NodeCardProps {
  node: NodeData;
  onExpand: (node: NodeData) => void;
  onSelect: (node: NodeData) => void;
  isSelected: boolean;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onExpand, onSelect, isSelected }) => {
  const isFundamental = node.type === NodeType.FUNDAMENTAL;
  const isRoot = node.type === NodeType.ROOT;
  const isLoading = node.isLoading;
  const isExpanded = node.isExpanded;
  
  // Style config based on the screenshot (Teal/Green theme)
  // The screenshot shows a uniform teal color for nodes.
  const baseClasses = "relative flex items-center px-4 w-48 h-14 rounded-md transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 border border-white/10";
  
  // Custom Teal Colors matching the reference
  // Root and regular components share similar visual weight in the screenshot
  const colorClasses = isRoot 
    ? "bg-[#0f766e] text-white" // slightly darker/richer for root (teal-700)
    : "bg-[#115e59] text-white"; // teal-800 for components

  // Selected state
  const selectionClasses = isSelected 
    ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950" 
    : "";

  return (
    <div className="flex flex-col items-center group/card z-20">
      
      {/* Main Card Body */}
      <div 
        className={`${baseClasses} ${colorClasses} ${selectionClasses}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
      >
        {/* Generic Icon Placeholder (Matches screenshot layout) */}
        <div className="mr-3 text-teal-200/70">
            {isFundamental ? (
                // Atom/Core icon for fundamentals
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            ) : isRoot ? (
                // Root icon
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            ) : (
                // Generic Component Icon (Page/Doc style)
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )}
        </div>

        <div className="text-left flex-1 min-w-0">
          <span className="text-sm font-medium leading-tight truncate block">
            {node.name}
          </span>
        </div>
        
        {/* Level Indicator (Subtle) */}
        {isFundamental && (
            <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></div>
        )}
      </div>

      {/* Expand/Collapse Toggle Button (Hanging from bottom) */}
      {!isFundamental && (
        <div className="h-5 w-px border-l border-dashed border-slate-500 relative flex items-end justify-center">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onExpand(node);
                }}
                className={`
                    absolute top-full -translate-y-1/2 rounded-full w-6 h-6 flex items-center justify-center border 
                    transition-all duration-200 z-30
                    ${isLoading 
                        ? 'bg-slate-900 border-slate-600 cursor-wait' 
                        : 'bg-[#0f172a] border-slate-500 hover:border-white text-slate-400 hover:text-white'}
                `}
                title={isExpanded ? "Collapse" : "Decompose"}
            >
                {isLoading ? (
                     <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                ) : isExpanded ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                )}
            </button>
        </div>
      )}
    </div>
  );
};

export default NodeCard;