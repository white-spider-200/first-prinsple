import React, { useState, useCallback } from 'react';
import { NodeData, NodeType, TreeStructure } from './types';
import { decomposeTopic, verifyFundamental } from './services/geminiService';
import TreeVisualizer from './components/TreeVisualizer';

// Utility for generating IDs
const uuid = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  const [inputTopic, setInputTopic] = useState('');
  const [tree, setTree] = useState<TreeStructure>({ root: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  // Helper to deep update the tree
  const updateNodeInTree = useCallback((root: NodeData, targetId: string, updateFn: (n: NodeData) => NodeData): NodeData => {
    if (root.id === targetId) {
      return updateFn(root);
    }
    if (root.children) {
      return {
        ...root,
        children: root.children.map(child => updateNodeInTree(child, targetId, updateFn))
      };
    }
    return root;
  }, []);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTopic.trim()) return;

    setIsProcessing(true);
    setError(null);
    setTree({ root: null });
    setSelectedNode(null);

    try {
      const data = await decomposeTopic(inputTopic);
      
      const rootNode: NodeData = {
        id: uuid(),
        name: inputTopic,
        description: "Root Subject",
        type: NodeType.ROOT,
        level: 0,
        isExpanded: true,
        assumptions: data.assumptions,
        children: data.components.map(comp => ({
          id: uuid(),
          name: comp.name,
          description: comp.description,
          type: comp.isFundamental ? NodeType.FUNDAMENTAL : NodeType.COMPONENT,
          level: 1,
          reasoning: comp.reasoning,
          assumptions: [], // Initial children might not have detailed assumptions yet
          children: []
        }))
      };

      setTree({ root: rootNode });
      setSelectedNode(rootNode); // Auto select root
    } catch (err) {
      setError("Failed to analyze topic. Please check your API Key and try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExpandNode = async (node: NodeData) => {
    if (!tree.root) return;

    // Toggle collapse if already has children
    if (node.children && node.children.length > 0) {
      const newRoot = updateNodeInTree(tree.root, node.id, (n) => ({
        ...n,
        isExpanded: !n.isExpanded
      }));
      setTree({ root: newRoot });
      return;
    }

    // Set loading state
    setTree(prev => ({
      root: prev.root ? updateNodeInTree(prev.root, node.id, n => ({ ...n, isLoading: true })) : null
    }));

    try {
      // Decompose using Gemini
      // If we are deep (level > 4), strictly verify fundamentals
      const parentContext = node.name; // Simplification: using node name as context
      const data = await verifyFundamental(node.name, parentContext);

      const newChildren: NodeData[] = data.components.map(comp => ({
        id: uuid(),
        name: comp.name,
        description: comp.description,
        type: comp.isFundamental ? NodeType.FUNDAMENTAL : NodeType.COMPONENT,
        level: node.level + 1,
        reasoning: comp.reasoning,
        children: []
      }));

      // Update tree with new children and assumptions
      setTree(prev => {
        if (!prev.root) return prev;
        return {
          root: updateNodeInTree(prev.root, node.id, n => ({
            ...n,
            isLoading: false,
            isExpanded: true,
            children: newChildren,
            // Append new specific assumptions found during this step
            assumptions: [...(n.assumptions || []), ...data.assumptions]
          }))
        };
      });

    } catch (err) {
      console.error(err);
      // Reset loading state on error
      setTree(prev => ({
        root: prev.root ? updateNodeInTree(prev.root, node.id, n => ({ ...n, isLoading: false })) : null
      }));
    }
  };

  const handleSelectNode = (node: NodeData) => {
    setSelectedNode(node);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-primary-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold font-mono">
              FP
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">First-Principles <span className="text-slate-500 font-normal">Reasoning Engine</span></h1>
          </div>
          <div className="text-xs text-slate-500 font-mono hidden md:block">
            v1.0.0 • Recursive Analysis
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 h-[calc(100vh-4rem)]">
        
        {/* Left Panel: Input & Tree */}
        <section className="flex-1 flex flex-col min-h-0">
          
          {/* Input Area */}
          <div className="mb-8">
            <form onSubmit={handleInitialSubmit} className="relative group">
              <input
                type="text"
                value={inputTopic}
                onChange={(e) => setInputTopic(e.target.value)}
                placeholder="Enter a complex topic (e.g., 'Web Security', 'Money', 'Happiness')..."
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-4 px-6 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-xl placeholder:text-slate-600"
                disabled={isProcessing && !tree.root}
              />
              <button
                type="submit"
                disabled={isProcessing || !inputTopic}
                className="absolute right-2 top-2 bottom-2 bg-primary-600 hover:bg-primary-500 text-white px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing && !tree.root ? 'Analyzing...' : 'Decompose'}
                {!isProcessing && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </form>
            {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
          </div>

          {/* Tree Viewport */}
          <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/30 p-8 shadow-inner relative">
            {!tree.root && !isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <p className="font-mono text-sm text-center max-w-xs">Enter a topic to begin the recursive decomposition process.</p>
              </div>
            )}
            
            {tree.root && (
              <TreeVisualizer 
                node={tree.root} 
                onExpand={handleExpandNode} 
                onSelect={handleSelectNode}
                selectedNodeId={selectedNode?.id || null}
              />
            )}
          </div>
        </section>

        {/* Right Panel: Analysis Details */}
        <aside className="w-full md:w-96 flex flex-col gap-6 h-full min-h-0 overflow-y-auto pr-2">
          {selectedNode ? (
            <>
              {/* Node Details Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`w-3 h-3 rounded-full ${selectedNode.type === NodeType.FUNDAMENTAL ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-primary-500'}`}></span>
                  <h2 className="text-xl font-bold text-white">{selectedNode.name}</h2>
                </div>
                <p className="text-slate-300 leading-relaxed mb-4">
                  {selectedNode.description}
                </p>
                {selectedNode.reasoning && (
                  <div className="bg-slate-900/50 rounded p-3 mb-4 border border-slate-800">
                    <p className="text-xs text-slate-500 uppercase font-mono mb-1">Reasoning</p>
                    <p className="text-sm text-slate-300 italic">"{selectedNode.reasoning}"</p>
                  </div>
                )}
                <div className="flex gap-2 text-xs font-mono text-slate-500">
                  <span>Level: {selectedNode.level}</span>
                  <span>•</span>
                  <span>Type: {selectedNode.type}</span>
                </div>
              </div>

              {/* Assumptions Module */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 shadow-lg flex-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Hidden Assumptions
                </h3>
                
                {selectedNode.assumptions && selectedNode.assumptions.length > 0 ? (
                  <ul className="space-y-3">
                    {selectedNode.assumptions.map((assumption, idx) => (
                      <li key={idx} className="flex gap-3 text-sm text-slate-300 group">
                        <span className="text-primary-500/50 group-hover:text-primary-400 transition-colors mt-1">▹</span>
                        <span className="leading-relaxed">{assumption}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                   <div className="text-center py-8 text-slate-600">
                     <p className="text-sm">No specific assumptions generated for this node yet.</p>
                     <p className="text-xs mt-2">Try expanding it to reveal deeper constraints.</p>
                   </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl p-8">
               <p className="font-mono text-sm">Select a node in the tree to view its analytical details and assumptions.</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}