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
  const hasChildren = node.children && node.children.length > 0;

  // Theme configuration based on node type
  const theme = {
    fundamental: {
      border: 'border-emerald-500',
      text: 'text-emerald-400',
      pill: 'bg-emerald-950/50 text-emerald-300 border-emerald-800',
      glow: isSelected ? 'shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]' : 'shadow-lg shadow-emerald-900/10',
    },
    root: {
      border: 'border-indigo-500',
      text: 'text-indigo-400',
      pill: 'bg-indigo-950/50 text-indigo-300 border-indigo-800',
      glow: isSelected ? 'shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]' : 'shadow-lg shadow-indigo-900/10',
    },
    default: {
      border: 'border-sky-500',
      text: 'text-sky-400',
      pill: 'bg-slate-800 text-slate-300 border-slate-700',
      glow: isSelected ? 'shadow-[0_0_20px_-5px_rgba(14,165,233,0.3)]' : 'shadow-lg',
    }
  };

  const currentTheme = isFundamental ? theme.fundamental : isRoot ? theme.root : theme.default;
  
  return (
    <div 
      className={`
        group relative flex flex-col w-72 rounded-r-lg rounded-l-[2px] border-l-[3px]
        backdrop-blur-md transition-all duration-300 ease-out cursor-pointer
        ${currentTheme.border}
        ${isSelected ? 'bg-slate-800 translate-x-1 ring-1 ring-white/10' : 'bg-slate-900/80 hover:bg-slate-800 hover:translate-x-1'}
        ${currentTheme.glow}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
    >
      {/* Header Row */}
      <div className="flex justify-between items-center px-4 pt-3 pb-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${currentTheme.text}`}>
          {isFundamental ? 'Fundamental Principle' : node.type}
        </span>
        {hasChildren && (
          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            {node.children?.length}
          </span>
        )}
      </div>

      {/* Content Body */}
      <div className="px-4 pb-3">
        <h3 className={`text-base font-semibold text-slate-100 leading-snug mb-1.5 ${isSelected ? 'text-white' : ''}`}>
          {node.name}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 group-hover:text-slate-300 transition-colors">
          {node.description}
        </p>
      </div>

      {/* Action Footer (Only for non-fundamentals) */}
      {!isFundamental && (
        <div className="px-3 pb-3 pt-1 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
           {/* Spacer to push button right, or add secondary info here */}
           <div /> 
           
           <button 
            onClick={(e) => {
              e.stopPropagation();
              onExpand(node);
            }}
            disabled={node.isLoading}
            className={`
              relative overflow-hidden text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded
              flex items-center gap-2 transition-all border
              ${node.isLoading 
                ? 'bg-slate-800 text-slate-500 border-transparent cursor-wait' 
                : 'bg-slate-800/50 hover:bg-sky-500/10 text-slate-400 hover:text-sky-300 border-slate-700 hover:border-sky-500/50'}
            `}
          >
            {node.isLoading ? (
               <>
                 <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Processing
               </>
            ) : (
               <>
                 {node.isExpanded ? 'Collapse' : 'Decompose'}
                 <svg 
                   className={`w-3 h-3 transition-transform duration-300 ${node.isExpanded ? 'rotate-180' : ''}`} 
                   fill="none" viewBox="0 0 24 24" stroke="currentColor"
                 >
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
               </>
            )}
          </button>
        </div>
      )}

      {/* Selected Indicator Line (Right side) */}
      {isSelected && (
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
      )}
    </div>
  );
};

export default NodeCard;