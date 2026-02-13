import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NodeData, NodeType, TreeStructure, SearchMode, QueryAnalysisResponse } from './types';
import { decomposeTopic, verifyFundamental, analyzeUserQuery, generateTopicImage, getElaboration } from './services/geminiService';
import TreeVisualizer from './components/TreeVisualizer';

// Utility for generating IDs
const uuid = () => Math.random().toString(36).substr(2, 9);

// Internal Component for Expandable Text
const ExpandableText = ({ text, className = "" }: { text: string; className?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Simple heuristic: if text is longer than X characters, show button
    // Or check clientHeight vs scrollHeight if not using line-clamp initially
    if (text.length > 250) {
      setShouldShowButton(true);
    } else {
      setShouldShowButton(false);
    }
  }, [text]);

  return (
    <div className="relative">
      <p 
        ref={textRef}
        className={`text-sm text-slate-300 leading-relaxed font-light transition-all duration-300 ${!isExpanded ? 'line-clamp-3' : ''} ${className}`}
      >
        {text}
      </p>
      {shouldShowButton && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 focus:outline-none"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
          <svg 
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
};

// System Status Badge Component
const SystemStatusBadge = ({ status }: { status: 'ONLINE' | 'OFFLINE' }) => {
  const isOnline = status === 'ONLINE';
  
  return (
    <div className={`
      flex items-center gap-2 px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-colors cursor-help group relative
      ${isOnline 
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}
    `}>
      <span className="relative flex h-2 w-2">
        {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
      </span>
      {isOnline ? 'AI Active' : 'Offline Mode'}

      {/* Tooltip */}
      <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-left normal-case">
         <p className="text-white mb-1">{isOnline ? 'Gemini AI Connected' : 'Limited Functionality'}</p>
         <p className="text-slate-400 font-normal leading-relaxed">
            {isOnline 
              ? 'Deep reasoning and image generation are active.' 
              : 'AI Quota exceeded or key missing. Using Wikipedia structure fallback. Detailed reasoning may be limited.'}
         </p>
      </div>
    </div>
  );
};

export default function App() {
  // Input State
  const [inputTopic, setInputTopic] = useState('');
  const [selectedMode, setSelectedMode] = useState<SearchMode>(SearchMode.CONCEPT);
  
  // Search Flow State
  const [searchStage, setSearchStage] = useState<'IDLE' | 'ANALYZING' | 'REVIEW' | 'PROCESSING'>('IDLE');
  const [queryAnalysis, setQueryAnalysis] = useState<QueryAnalysisResponse | null>(null);
  
  // System Status
  const [systemStatus, setSystemStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');

  // App Data State
  const [tree, setTree] = useState<TreeStructure>({ root: null });
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  
  // Accordion state for right panel
  const [openAssumptions, setOpenAssumptions] = useState(true);
  const [openInsight, setOpenInsight] = useState(true);
  const [openSources, setOpenSources] = useState(true);

  // Mock History (could be persisted)
  const [history, setHistory] = useState(['Web Security', 'Money', 'Entropy']);

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

  // --- Step 1: Analyze Query ---
  const handleAnalyzeQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTopic.trim()) return;

    setSearchStage('ANALYZING');
    setError(null);
    setQueryAnalysis(null);

    try {
      const analysis = await analyzeUserQuery(inputTopic);
      setQueryAnalysis(analysis);
      
      // Update system status based on source
      setSystemStatus(analysis.dataSource === 'FALLBACK' ? 'OFFLINE' : 'ONLINE');

      // Auto-switch mode if detecting something specific unless user manually set it
      if (analysis.intent) {
        setSelectedMode(analysis.intent);
      }
      
      setSearchStage('REVIEW');
    } catch (err) {
      // If complete failure (even fallback failed), show error
      setError("Could not analyze query. Try again.");
      setSearchStage('IDLE');
      console.error(err);
    }
  };

  // --- Step 2: Clarification / Refinement ---
  const handleClarificationSelection = (option: string) => {
    // User picked a specific option from ambiguity list
    setInputTopic(option);
    // Re-analyze with the specific term
    setTimeout(() => handleAnalyzeQuery(), 0); 
  };

  // --- Step 3: Execute Decomposition ---
  const handleExecuteDecomposition = async () => {
    if (!queryAnalysis) return;

    setSearchStage('PROCESSING');
    setTree({ root: null });
    setSelectedNode(null);

    // Add to history if not present
    if (!history.includes(queryAnalysis.correctedQuery)) {
        setHistory(prev => [queryAnalysis.correctedQuery, ...prev].slice(0, 5));
    }

    try {
      // Execute decomposition and image generation in parallel
      const [data, imageUrl] = await Promise.all([
        decomposeTopic(
            queryAnalysis.correctedQuery, 
            queryAnalysis.enrichment, 
            selectedMode, 
            queryAnalysis.domain
        ),
        generateTopicImage(queryAnalysis.correctedQuery)
      ]);
      
      // Update status again in case it changed during decomposition
      setSystemStatus(data.dataSource === 'FALLBACK' ? 'OFFLINE' : 'ONLINE');

      const rootNode: NodeData = {
        id: uuid(),
        name: queryAnalysis.correctedQuery,
        description: data.core_concept || "Root Subject",
        core_concept: data.core_concept,
        analogy: data.analogy,
        why_important: data.why_important,
        imageUrl: imageUrl || undefined, // Attach generated image
        type: NodeType.ROOT,
        level: 0,
        isExpanded: true,
        assumptions: data.assumptions,
        sources: data.sources,
        children: data.components.map(comp => ({
          id: uuid(),
          name: comp.name,
          description: comp.description,
          type: comp.isFundamental ? NodeType.FUNDAMENTAL : NodeType.COMPONENT,
          level: 1,
          reasoning: comp.reasoning,
          assumptions: [], 
          children: []
        }))
      };

      setTree({ root: rootNode });
      setSelectedNode(rootNode);
      // Reset search stage to allow new searches, but keep tree visible
      setSearchStage('IDLE');

      // Trigger image generation for initial children
      rootNode.children?.forEach(child => {
        generateTopicImage(child.name).then(url => {
            if (url) {
                setTree(prev => {
                    if (!prev.root) return prev;
                    return {
                        root: updateNodeInTree(prev.root, child.id, n => ({ ...n, imageUrl: url }))
                    };
                });
                if (selectedNode?.id === child.id) {
                     setSelectedNode(prev => prev ? { ...prev, imageUrl: url } : null);
                }
            }
        });
      });
      
    } catch (err) {
      setError("Failed to generate breakdown. Please try again.");
      setSearchStage('REVIEW');
      console.error(err);
    }
  };

  const handleExpandNode = async (node: NodeData) => {
    if (!tree.root) return;

    if (node.children && node.children.length > 0) {
      const newRoot = updateNodeInTree(tree.root, node.id, (n) => ({
        ...n,
        isExpanded: !n.isExpanded
      }));
      setTree({ root: newRoot });
      return;
    }

    setTree(prev => ({
      root: prev.root ? updateNodeInTree(prev.root, node.id, n => ({ ...n, isLoading: true })) : null
    }));

    try {
      const parentContext = node.name;
      const data = await verifyFundamental(node.name, parentContext);
      
      // Update status quietly
      setSystemStatus(data.dataSource === 'FALLBACK' ? 'OFFLINE' : 'ONLINE');

      const newChildren: NodeData[] = data.components.map(comp => ({
        id: uuid(),
        name: comp.name,
        description: comp.description,
        type: comp.isFundamental ? NodeType.FUNDAMENTAL : NodeType.COMPONENT,
        level: node.level + 1,
        reasoning: comp.reasoning,
        children: []
      }));

      setTree(prev => {
        if (!prev.root) return prev;
        const newRoot = updateNodeInTree(prev.root, node.id, n => ({
          ...n,
          isLoading: false,
          isExpanded: true,
          children: newChildren,
          description: data.core_concept || n.description,
          core_concept: data.core_concept,
          analogy: data.analogy,
          why_important: data.why_important,
          assumptions: [...(n.assumptions || []), ...data.assumptions],
          sources: data.sources // Append sources from verification step
        }));
        
        if (selectedNode && selectedNode.id === node.id) {
           setSelectedNode(prevSel => prevSel ? ({
             ...prevSel,
             description: data.core_concept || prevSel.description,
             core_concept: data.core_concept,
             analogy: data.analogy,
             why_important: data.why_important,
             assumptions: [...(prevSel.assumptions || []), ...data.assumptions],
             sources: data.sources
           }) : null);
        }
        return { root: newRoot };
      });

      // Trigger image generation for new children in background
      newChildren.forEach(child => {
          generateTopicImage(child.name).then(url => {
              if (url) {
                  setTree(prev => {
                      if (!prev.root) return prev;
                      return {
                          root: updateNodeInTree(prev.root, child.id, n => ({ ...n, imageUrl: url }))
                      };
                  });
                  // Also update selected node if it happens to be this one
                  setSelectedNode(current => (current && current.id === child.id) ? { ...current, imageUrl: url } : current);
              }
          });
      });

    } catch (err) {
      console.error(err);
      setTree(prev => ({
        root: prev.root ? updateNodeInTree(prev.root, node.id, n => ({ ...n, isLoading: false })) : null
      }));
    }
  };

  const handleElaborate = async (node: NodeData) => {
      if (!tree.root) return;
      
      // Update UI to show loading state for elaboration
      setTree(prev => ({
          root: prev.root ? updateNodeInTree(prev.root, node.id, n => ({ ...n, isElaborating: true })) : null
      }));
      if (selectedNode?.id === node.id) {
          setSelectedNode(prev => prev ? { ...prev, isElaborating: true } : null);
      }

      const explanation = await getElaboration(node.name, node.description);

      // Save explanation to node
       setTree(prev => {
        if (!prev.root) return prev;
        const newRoot = updateNodeInTree(prev.root, node.id, n => ({
          ...n,
          isElaborating: false,
          detailedExplanation: explanation
        }));
        
        if (selectedNode && selectedNode.id === node.id) {
           setSelectedNode(prevSel => prevSel ? ({
             ...prevSel,
             isElaborating: false,
             detailedExplanation: explanation
           }) : null);
        }
        return { root: newRoot };
      });
  };

  const handleSelectNode = (node: NodeData) => {
    setSelectedNode(node);
  };

  const handleExport = () => {
    if (!tree.root) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tree, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "first_principles_analysis.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMode(e.target.value as SearchMode);
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col">
      
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur z-50 h-14 flex-none">
        <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold font-mono text-sm shadow-lg shadow-blue-900/40">
                FP
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-white">First-Principles <span className="text-slate-500 font-normal">Reasoning Engine</span></h1>
            </div>
            
            {/* New System Status Badge */}
            <SystemStatusBadge status={systemStatus} />
          </div>

          <div className="text-[10px] text-slate-500 font-mono hidden md:block uppercase tracking-wider">
            v1.3.1 • Progressive Disclosure Active
          </div>
        </div>
      </header>

      {/* Main Layout - 2 Columns (Tree Area + Inspector) */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Search & Tree */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-slate-800/50 bg-slate-950 relative transition-all duration-500 ease-in-out">
          
          {/* Top Bar: Intelligent Search Module */}
          <div className="p-6 pb-2 z-20">
            <div className={`transition-all duration-500 ${selectedNode ? 'max-w-3xl' : 'max-w-4xl mx-auto'}`}>
                
                {/* Search Input Group */}
                <form onSubmit={handleAnalyzeQuery} className="relative group mb-4">
                  <div className="flex shadow-sm rounded-lg overflow-hidden border border-slate-700 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                    
                    {/* Mode Selector */}
                    <div className="bg-slate-900 border-r border-slate-700 px-3 flex items-center relative">
                       <select 
                         value={selectedMode}
                         onChange={handleModeChange}
                         className="bg-transparent text-xs font-bold text-slate-400 uppercase tracking-wider focus:outline-none appearance-none pr-6 cursor-pointer hover:text-white transition-colors"
                         disabled={searchStage !== 'IDLE' && searchStage !== 'REVIEW'}
                       >
                         <option value={SearchMode.CONCEPT}>Concept</option>
                         <option value={SearchMode.PROBLEM}>Problem</option>
                         <option value={SearchMode.COMPARE}>Compare</option>
                         <option value={SearchMode.WHY}>Why</option>
                       </select>
                       <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                       </div>
                    </div>

                    {/* Main Input */}
                    <input
                        type="text"
                        value={inputTopic}
                        onChange={(e) => {
                            setInputTopic(e.target.value);
                            if (searchStage === 'REVIEW') setSearchStage('IDLE'); 
                        }}
                        placeholder={
                            selectedMode === SearchMode.WHY ? "Why does... / What causes..." :
                            selectedMode === SearchMode.COMPARE ? "X vs Y..." :
                            selectedMode === SearchMode.PROBLEM ? "How to fix... / Issue with..." :
                            "What do you want to understand?"
                        }
                        className="flex-1 bg-slate-900 text-white py-3 px-4 text-base focus:outline-none placeholder:text-slate-600"
                        disabled={searchStage === 'ANALYZING' || searchStage === 'PROCESSING'}
                    />

                    {/* Action Button */}
                    <button
                        type="submit"
                        disabled={!inputTopic || searchStage === 'ANALYZING' || searchStage === 'PROCESSING'}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 font-medium text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {searchStage === 'ANALYZING' ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                                <span className="hidden sm:inline">Analyzing</span>
                            </>
                        ) : searchStage === 'REVIEW' ? (
                             'Update'
                        ) : (
                             'Analyze'
                        )}
                    </button>
                  </div>
                </form>

                {/* Analysis Review & Preview Card */}
                {searchStage === 'REVIEW' && queryAnalysis && (
                    <div className="mb-4 bg-slate-900/80 border border-indigo-500/30 rounded-lg p-4 backdrop-blur animate-in fade-in slide-in-from-top-2">
                        
                        {/* Ambiguity Check */}
                        {queryAnalysis.isAmbiguous ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Ambiguous Input Detected
                                </div>
                                <p className="text-slate-400 text-sm">Did you mean:</p>
                                <div className="flex flex-wrap gap-2">
                                    {queryAnalysis.ambiguityOptions?.map((opt, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleClarificationSelection(opt)}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm text-slate-200 transition-colors"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Success Preview */
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-white font-medium flex items-center gap-2">
                                            {queryAnalysis.correctedQuery}
                                            {queryAnalysis.correctedQuery !== queryAnalysis.originalQuery && (
                                                <span className="text-xs text-slate-500 line-through decoration-slate-600">{queryAnalysis.originalQuery}</span>
                                            )}
                                        </h3>
                                        <div className="flex gap-2 mt-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                                                {queryAnalysis.intent} Mode
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                                {queryAnalysis.domain}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={handleExecuteDecomposition}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-md text-sm font-medium shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all hover:scale-105"
                                    >
                                        <span>Start Decomposition</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </button>
                                </div>

                                {/* Predicted Topics Preview */}
                                {queryAnalysis.predictedTopics && queryAnalysis.predictedTopics.length > 0 && (
                                    <div className="pt-3 border-t border-indigo-500/10">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Analysis Preview</p>
                                        <div className="flex gap-4">
                                            {queryAnalysis.predictedTopics.map((topic, i) => (
                                                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
                                                    <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                                                    {topic}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Processing State Overlay */}
                {searchStage === 'PROCESSING' && (
                     <div className="mb-4 bg-slate-900/50 border border-blue-500/30 rounded-lg p-4 flex items-center gap-4 animate-pulse">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-sm text-blue-200">Searching web & Decomposing <strong>{queryAnalysis?.correctedQuery}</strong>...</div>
                     </div>
                )}

                {/* History & Quick Links (Only show when IDLE) */}
                {searchStage === 'IDLE' && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider whitespace-nowrap">Recent:</span>
                        {history.map(item => (
                            <button 
                                key={item} 
                                onClick={() => { setInputTopic(item); setTimeout(() => handleAnalyzeQuery(), 0); }}
                                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded border border-transparent hover:border-slate-800 hover:bg-slate-900 whitespace-nowrap"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                )}
                
                {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
            </div>
          </div>

          {/* Tree Canvas */}
          <div className="flex-1 overflow-auto p-8 relative">
            {!tree.root && searchStage === 'IDLE' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 pointer-events-none">
                <svg className="w-24 h-24 mb-6 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <div className="max-w-md text-center">
                    <h3 className="text-lg font-semibold text-slate-500 mb-2">Intelligent Analysis</h3>
                    <p className="text-sm text-slate-600">Select a mode (Concept, Problem, Why) to guide the AI. The system will analyze your intent before decomposing.</p>
                </div>
              </div>
            )}
            
            {tree.root && (
              <div className="min-w-max pb-20 animate-in fade-in duration-500 mx-auto">
                <TreeVisualizer 
                    node={tree.root} 
                    onExpand={handleExpandNode} 
                    onSelect={handleSelectNode}
                    selectedNodeId={selectedNode?.id || null}
                />
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Inspector - Only Render if selectedNode exists */}
        {selectedNode && (
          <aside className="w-[420px] bg-slate-900/50 border-l border-slate-800 flex flex-col flex-none animate-in slide-in-from-right-10 duration-300">
            <div className="flex flex-col h-full">
                
                {/* Panel Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur relative overflow-hidden">
                    {/* Background faint image if root */}
                    {selectedNode.imageUrl && selectedNode.type === NodeType.ROOT && (
                        <div className="absolute inset-0 opacity-10 bg-center bg-cover pointer-events-none blur-sm" style={{backgroundImage: `url(${selectedNode.imageUrl})`}}></div>
                    )}

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                                <span className={`flex-none w-2.5 h-2.5 rounded-full ${selectedNode.type === NodeType.FUNDAMENTAL ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-blue-500 shadow-blue-500/50'} shadow-sm`}></span>
                                <h2 className="text-lg font-bold text-white tracking-tight truncate" title={selectedNode.name}>{selectedNode.name}</h2>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={handleExport} className="text-xs flex items-center gap-1 text-slate-500 hover:text-white transition-colors border border-slate-700 rounded px-2 py-1 bg-slate-800">
                                    Export
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                <button 
                                    onClick={() => setSelectedNode(null)}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                                    title="Close details"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Expandable Description */}
                        <ExpandableText text={selectedNode.description} />
                        
                        {/* Deep Dive / Elaborate Button */}
                        {!selectedNode.detailedExplanation && (
                            <button
                                onClick={() => selectedNode && handleElaborate(selectedNode)}
                                disabled={selectedNode.isElaborating}
                                className={`
                                    mt-4 w-full py-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 hover:border-indigo-500/50
                                    text-xs font-bold uppercase tracking-wider text-indigo-300 transition-all
                                    flex items-center justify-center gap-2 group
                                    ${selectedNode.isElaborating ? 'opacity-70 cursor-wait' : ''}
                                `}
                            >
                                {selectedNode.isElaborating ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                                        Writing Deep Dive...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-indigo-400 group-hover:animate-pulse">✨</span> Deep Dive
                                    </>
                                )}
                            </button>
                        )}
                        
                        {/* Render Deep Dive Content if available */}
                        {selectedNode.detailedExplanation && (
                            <div className="mt-4 p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/20 animate-in fade-in slide-in-from-bottom-2">
                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                                    Deep Dive Analysis
                                </div>
                                <p className="text-sm text-indigo-100/90 leading-relaxed font-light">
                                    {selectedNode.detailedExplanation}
                                </p>
                            </div>
                        )}

                    </div>
                </div>

                {/* Panel Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    
                    {/* Sources Card (New) */}
                     <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                        <button 
                            onClick={() => setOpenSources(!openSources)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                Sources & Citations
                            </div>
                            <svg className={`w-4 h-4 text-slate-500 transition-transform ${openSources ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {openSources && (
                            <div className="px-4 pb-4 bg-slate-900/50">
                                {selectedNode.sources && selectedNode.sources.length > 0 ? (
                                    <ul className="space-y-2 pt-2">
                                        {selectedNode.sources.map((source, idx) => (
                                        <li key={idx} className="flex gap-3 text-sm text-slate-300 group">
                                            <a 
                                              href={source.uri} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 hover:underline truncate"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                                                {source.title}
                                            </a>
                                        </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="py-4 text-center text-slate-600 text-xs">
                                        {selectedNode.level === 0 ? "Analyzing web sources..." : "No specific sources cited for this component."}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Hidden Assumptions Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                        <button 
                            onClick={() => setOpenAssumptions(!openAssumptions)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Hidden Assumptions
                            </div>
                            <svg className={`w-4 h-4 text-slate-500 transition-transform ${openAssumptions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {openAssumptions && (
                            <div className="px-4 pb-4 bg-slate-900/50">
                                {selectedNode.assumptions && selectedNode.assumptions.length > 0 ? (
                                    <ul className="space-y-3 pt-2">
                                        {selectedNode.assumptions.map((assumption, idx) => (
                                        <li key={idx} className="flex gap-3 text-sm text-slate-300 group">
                                            <span className="text-blue-500/50 mt-1">▹</span>
                                            <span className="leading-relaxed font-light">{assumption}</span>
                                        </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="py-4 text-center text-slate-600 text-xs">No explicit assumptions detected.</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Insight Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                         <button 
                            onClick={() => setOpenInsight(!openInsight)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Insight
                            </div>
                            <svg className={`w-4 h-4 text-slate-500 transition-transform ${openInsight ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {openInsight && (
                            <div className="px-4 pb-4 pt-2 bg-slate-900/50">
                                <div className="mb-3">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Why is this important?</span>
                                    <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                                        {selectedNode.why_important || "Contextual importance is derived from parent components."}
                                    </p>
                                </div>
                                
                                {selectedNode.analogy && (
                                    <div className="mt-4 pt-3 border-t border-slate-800">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Analogy</span>
                                        <p className="text-sm text-indigo-300 mt-1 italic">
                                            "{selectedNode.analogy}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}