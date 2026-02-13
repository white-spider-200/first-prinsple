
import React from 'react';
import { NodeData, NodeType } from '../types';

interface NodeCardProps {
  node: NodeData;
  onExpand: (node: NodeData) => void;
  onSelect: (node: NodeData) => void;
  isSelected: boolean;
  isHovered?: boolean;
  isRelatedToHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ 
    node, 
    onExpand, 
    onSelect, 
    isSelected, 
    isHovered, 
    isRelatedToHovered,
    onMouseEnter,
    onMouseLeave
}) => {
  const isFundamental = node.type === NodeType.FUNDAMENTAL;
  const isRoot = node.type === NodeType.ROOT;
  const isLoading = node.isLoading;
  const isExpanded = node.isExpanded;
  const isMastered = node.isMastered;
  
  const baseClasses = "relative flex flex-col justify-center px-4 w-52 h-16 rounded-lg transition-all duration-300 cursor-pointer border";
  
  // Dynamic color logic matching screenshot (Bright Green-Teal)
  let colorClasses = "";
  if (isSelected) {
      colorClasses = "bg-[#2dd4bf] border-white shadow-[0_0_20px_rgba(45,212,191,0.4)] text-slate-950 z-30";
  } else if (isHovered) {
      colorClasses = "bg-[#14b8a6] border-teal-300 shadow-[0_0_25px_rgba(20,184,166,0.6)] text-white scale-105 z-40";
  } else if (isMastered) {
      colorClasses = "bg-[#0f766e] border-teal-400/50 text-teal-50 opacity-90";
  } else {
      colorClasses = isRoot 
        ? "bg-[#0d9488] border-white/10 text-white"
        : "bg-[#115e59] border-white/10 text-white";
  }

  return (
    <div 
        className="flex flex-col items-center group/card z-10"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
    >
      <div 
        className={`${baseClasses} ${colorClasses}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
      >
        {/* LVL Badge - Top Right (Reference Style) */}
        <div className={`absolute top-1.5 right-2 text-[8px] font-bold uppercase tracking-widest opacity-60 ${isSelected ? 'text-slate-900' : 'text-teal-200'}`}>
            LVL {node.level}
        </div>

        <div className="flex items-center">
            <div className={`mr-2.5 transition-colors duration-300 ${isSelected ? 'text-slate-900' : isHovered ? 'text-white' : 'text-teal-200/70'}`}>
                {isMastered ? (
                    <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                ) : isFundamental ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                )}
            </div>

            <div className="text-left flex-1 min-w-0 pr-6">
              <span className={`text-[13px] font-bold leading-tight truncate block transition-all ${isSelected ? 'text-slate-900' : ''}`}>
                {node.name}
              </span>
            </div>
        </div>
        
        {isFundamental && !isSelected && (
            <div className={`absolute bottom-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm transition-all duration-300 ${isHovered ? 'scale-150 shadow-emerald-400' : ''}`}></div>
        )}
      </div>

      {!isFundamental && (
        <div className={`h-6 w-px border-l border-dashed transition-colors duration-300 relative flex items-end justify-center ${isHovered ? 'border-teal-400 border-solid' : 'border-slate-500/50'}`}>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onExpand(node);
                }}
                className={`
                    absolute top-full -translate-y-1/2 rounded-full w-7 h-7 flex items-center justify-center border 
                    transition-all duration-200 z-30
                    ${isLoading 
                        ? 'bg-slate-900 border-slate-600 cursor-wait' 
                        : isHovered 
                            ? 'bg-teal-400 border-white text-slate-950 scale-110 shadow-lg shadow-teal-500/20'
                            : 'bg-slate-950 border-slate-700 hover:border-teal-400 text-slate-400 hover:text-white'}
                `}
            >
                {isLoading ? (
                     <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                ) : isExpanded ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                )}
            </button>
        </div>
      )}
    </div>
  );
};

export default NodeCard;
