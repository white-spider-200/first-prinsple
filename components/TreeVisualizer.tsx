import React from 'react';
import { NodeData } from '../types';
import NodeCard from './NodeCard';

interface TreeVisualizerProps {
  node: NodeData;
  onExpand: (node: NodeData) => void;
  onSelect: (node: NodeData) => void;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onHoverNode: (id: string | null) => void;
  depth?: number;
}

const TreeVisualizer: React.FC<TreeVisualizerProps> = ({ 
  node, 
  onExpand, 
  onSelect, 
  selectedNodeId,
  hoveredNodeId,
  onHoverNode,
  depth = 0 
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = !!node.isExpanded;

  // Highlight logic
  const isHovered = hoveredNodeId === node.id;
  const isParentOfHovered = node.children?.some(child => child.id === hoveredNodeId);
  const isChildOfHovered = node.id !== hoveredNodeId && (/* handled by recursion check in parent */ false);
  
  // Note: Parent needs to tell children if they are children of hovered
  // But we can check globally if the current node's parent matches the hoveredNodeId.
  // A simpler way: just check if parentId matches hoveredNodeId (if we had parentId).
  // Instead, we'll use a prop `isParentHovered` in the recursion.

  return (
    <div className="flex flex-col items-center">
      
      {/* Node Component */}
      <NodeCard 
        node={node} 
        onExpand={onExpand} 
        onSelect={onSelect}
        isSelected={selectedNodeId === node.id}
        isHovered={isHovered}
        isRelatedToHovered={isParentOfHovered}
        onMouseEnter={() => onHoverNode(node.id)}
        onMouseLeave={() => onHoverNode(null)}
      />

      {/* Children Tree Container */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center animate-in fade-in duration-500">
          
          {/* Vertical Connector Down to horizontal bar */}
          <div className={`
            w-px h-6 border-l border-dashed transition-colors duration-300 relative
            ${isHovered ? 'border-teal-400 border-solid opacity-100' : 'border-slate-500 opacity-60'}
          `}></div>

          {/* Children Row */}
          <div className="flex flex-row items-start justify-center gap-12 relative pt-0">
             
            {node.children!.map((child, index) => {
              const isFirst = index === 0;
              const isLast = index === node.children!.length - 1;
              const isSingle = node.children!.length === 1;
              const isChildHovered = child.id === hoveredNodeId;
              const isLinkActive = isHovered || isChildHovered;

              return (
                <div key={child.id} className="flex flex-col items-center relative">
                   
                   {/* Horizontal Connector Bar */}
                   {!isSingle && (
                     <div 
                        className={`
                            absolute top-0 h-px border-t border-dashed transition-all duration-300
                            ${isLinkActive ? 'border-teal-400 border-solid opacity-100' : 'border-slate-500 opacity-40'}
                        `}
                        style={{
                            left: isFirst ? '50%' : 0,
                            right: isLast ? '50%' : 0,
                            width: isFirst || isLast ? '50%' : '100%'
                        }}
                     ></div>
                   )}

                   {/* Vertical Connector Down to Child Node */}
                   <div className={`
                     w-px h-8 border-l border-dashed transition-all duration-300
                     ${isLinkActive ? 'border-teal-400 border-solid opacity-100' : 'border-slate-500 opacity-60'}
                   `}></div>

                   {/* Recursive Child Tree */}
                   <TreeVisualizer 
                     node={child} 
                     onExpand={onExpand} 
                     onSelect={onSelect}
                     selectedNodeId={selectedNodeId}
                     hoveredNodeId={hoveredNodeId}
                     onHoverNode={onHoverNode}
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