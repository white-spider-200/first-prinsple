import React from 'react';
import { NodeData } from '../types';
import NodeCard from './NodeCard';

interface TreeVisualizerProps {
  node: NodeData;
  onExpand: (node: NodeData) => void;
  onSelect: (node: NodeData) => void;
  selectedNodeId: string | null;
  depth?: number;
}

const TreeVisualizer: React.FC<TreeVisualizerProps> = ({ 
  node, 
  onExpand, 
  onSelect, 
  selectedNodeId,
  depth = 0 
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = !!node.isExpanded;

  return (
    <div className="flex flex-col items-center">
      
      {/* Node Component */}
      <NodeCard 
        node={node} 
        onExpand={onExpand} 
        onSelect={onSelect}
        isSelected={selectedNodeId === node.id}
      />

      {/* Children Tree Container */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          
          {/* Connector: Vertical Line from Parent Button to horizontal bar */}
          {/* Note: The NodeCard has a stub, we continue here with a DASHED line */}
          <div className="w-px h-6 border-l border-dashed border-slate-500 relative"></div>

          {/* Children Row */}
          <div className="flex flex-row items-start justify-center gap-12 relative pt-0">
             
            {/* Map Children */}
            {node.children!.map((child, index) => {
              const isFirst = index === 0;
              const isLast = index === node.children!.length - 1;
              const isSingle = node.children!.length === 1;

              return (
                <div key={child.id} className="flex flex-col items-center relative">
                   
                   {/* Horizontal Connector Bar (The 'Stretcher') - DASHED */}
                   {!isSingle && (
                     <div 
                        className="absolute top-0 h-px border-t border-dashed border-slate-500"
                        style={{
                            left: isFirst ? '50%' : 0,
                            right: isLast ? '50%' : 0,
                            width: isFirst || isLast ? '50%' : '100%'
                        }}
                     ></div>
                   )}

                   {/* Vertical Connector Down to Child Node - DASHED */}
                   <div className="w-px h-8 border-l border-dashed border-slate-500"></div>

                   {/* Recursive Child Tree */}
                   <TreeVisualizer 
                     node={child} 
                     onExpand={onExpand} 
                     onSelect={onSelect}
                     selectedNodeId={selectedNodeId}
                     depth={depth + 1}
                   />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeVisualizer;