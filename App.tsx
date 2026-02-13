
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NodeData, NodeType, TreeStructure, SearchMode, QueryAnalysisResponse } from './types';
import { decomposeTopic, verifyFundamental, analyzeUserQuery, generateTopicImage, getElaboration, generateLearningQuestion } from './services/geminiService';
import TreeVisualizer from './components/TreeVisualizer';

const uuid = () => Math.random().toString(36).substr(2, 9);

const ExpandableText = ({ text, className = "" }: { text: string; className?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  useEffect(() => { setShouldShowButton(text.length > 250); }, [text]);

  return (
    <div className="relative">
      <p className={`text-sm text-slate-300 leading-relaxed font-light transition-all duration-300 ${!isExpanded ? 'line-clamp-3' : ''} ${className}`}>
        {text}
      </p>
      {shouldShowButton && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="mt-1 text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1">
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
};

export default function App() {
  const [inputTopic, setInputTopic] = useState('');
  const [selectedMode, setSelectedMode] = useState<SearchMode>(SearchMode.CONCEPT);
  const [searchStage, setSearchStage] = useState<'IDLE' | 'ANALYZING' | 'REVIEW' | 'PROCESSING'>('IDLE');
  const [queryAnalysis, setQueryAnalysis] = useState<QueryAnalysisResponse | null>(null);
  const [tree, setTree] = useState<TreeStructure>({ root: null });
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState(['Fusion Energy', 'Cryptography', 'Neural Networks']);

  const updateNodeInTree = useCallback((root: NodeData, targetId: string, updateFn: (n: NodeData) => NodeData): NodeData => {
    if (root.id === targetId) return updateFn(root);
    if (root.children) return { ...root, children: root.children.map(child => updateNodeInTree(child, targetId, updateFn)) };
    return root;
  }, []);

  const handleAnalyzeQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTopic.trim()) return;
    setSearchStage('ANALYZING');
    try {
      const analysis = await analyzeUserQuery(inputTopic);
      setQueryAnalysis(analysis);
      setSearchStage('REVIEW');
    } catch { setSearchStage('IDLE'); }
  };

  const handleExecuteDecomposition = async () => {
    if (!queryAnalysis) return;
    setSearchStage('PROCESSING');
    try {
      const [data, imageUrl] = await Promise.all([
        decomposeTopic(queryAnalysis.correctedQuery, queryAnalysis.enrichment, selectedMode, queryAnalysis.domain),
        generateTopicImage(queryAnalysis.correctedQuery)
      ]);
      const rootNode: NodeData = {
        id: uuid(),
        name: queryAnalysis.correctedQuery,
        description: data.core_concept,
        core_concept: data.core_concept,
        analogy: data.analogy,
        why_important: data.why_important,
        imageUrl: imageUrl || undefined,
        type: NodeType.ROOT,
        level: 0,
        isExpanded: true,
        assumptions: data.assumptions,
        sources: data.sources,
        children: data.components.map(comp => ({
          id: uuid(), name: comp.name, description: comp.description, type: comp.isFundamental ? NodeType.FUNDAMENTAL : NodeType.COMPONENT, level: 1, reasoning: comp.reasoning, children: []
        }))
      };
      setTree({ root: rootNode });
      setSelectedNode(rootNode);
      setSearchStage('IDLE');
    } catch { setSearchStage('REVIEW'); }
  };

  const handleToggleMastery = () => {
    if (!selectedNode || !tree.root) return;
    const newMastery = !selectedNode.isMastered;
    const updatedRoot = updateNodeInTree(tree.root, selectedNode.id, n => ({ ...n, isMastered: newMastery }));
    setTree({ root: updatedRoot });
    setSelectedNode({ ...selectedNode, isMastered: newMastery });
  };

  const handleSocraticChallenge = async () => {
    if (!selectedNode || !tree.root) return;
    setSelectedNode(prev => prev ? { ...prev, isGeneratingQuestion: true } : null);
    const question = await generateLearningQuestion(selectedNode.name, selectedNode.description);
    const updatedRoot = updateNodeInTree(tree.root, selectedNode.id, n => ({ ...n, learningQuestion: question, isGeneratingQuestion: false }));
    setTree({ root: updatedRoot });
    setSelectedNode({ ...selectedNode, learningQuestion: question, isGeneratingQuestion: false });
  };

  const handleExpandNode = async (node: NodeData) => {
    if (!tree.root) return;
    if (node.children && node.children.length > 0) {
      setTree({ root: updateNodeInTree(tree.root, node.id, n => ({ ...n, isExpanded: !n.isExpanded })) });
      return;
    }
    setTree({ root: updateNodeInTree(tree.root, node.id, n => ({ ...n, isLoading: true })) });
    try {
      const data = await verifyFundamental(node.name, node.name);
      const newChildren = data.components.map(comp => ({
        id: uuid(), name: comp.name, description: comp.description, type: comp.isFundamental ? NodeType.FUNDAMENTAL : NodeType.COMPONENT, level: node.level + 1, reasoning: comp.reasoning, children: []
      }));
      setTree({ root: updateNodeInTree(tree.root, node.id, n => ({ ...n, isLoading: false, isExpanded: true, children: newChildren })) });
    } catch { 
      setTree({ root: updateNodeInTree(tree.root, node.id, n => ({ ...n, isLoading: false })) });
    }
  };

  return (
    <div className="h-screen bg-[#020617] text-slate-200 font-sans flex flex-col overflow-hidden">
      <header className="h-14 border-b border-teal-900/40 bg-slate-950/80 backdrop-blur flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">FP</div>
          <h1 className="font-bold text-lg tracking-tight">Reasoning<span className="text-teal-500">Engine</span></h1>
        </div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-teal-600">
          <span>Active Learning Mode</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 flex flex-col relative overflow-hidden">
          <div className="p-6 bg-[#020617] z-10">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleAnalyzeQuery} className="relative group">
                <div className="flex bg-slate-900/50 border border-teal-900/50 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/30 transition-all">
                   <input
                    type="text"
                    value={inputTopic}
                    onChange={(e) => setInputTopic(e.target.value)}
                    placeholder="Enter a concept to master..."
                    className="flex-1 bg-transparent py-4 px-6 text-white outline-none placeholder:text-slate-600"
                  />
                  <button type="submit" className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-8 font-bold transition-all">Explore</button>
                </div>
              </form>
              
              {searchStage === 'REVIEW' && queryAnalysis && (
                <div className="mt-4 p-4 bg-teal-900/10 border border-teal-500/20 rounded-xl animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-teal-400 font-bold uppercase text-xs tracking-widest mb-1">Targeting</h3>
                      <p className="text-lg font-bold text-white">{queryAnalysis.correctedQuery}</p>
                    </div>
                    <button onClick={handleExecuteDecomposition} className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-2 rounded-lg font-bold shadow-lg shadow-teal-500/20 transition-all">Start Mastery Path</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-12 custom-scrollbar">
            {tree.root ? (
              <TreeVisualizer 
                node={tree.root} onExpand={handleExpandNode} onSelect={setSelectedNode} 
                selectedNodeId={selectedNode?.id || null} hoveredNodeId={hoveredNodeId} onHoverNode={setHoveredNodeId}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                <svg className="w-24 h-24 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <p className="text-sm tracking-widest uppercase font-bold">Awaiting Input</p>
              </div>
            )}
          </div>
        </section>

        {selectedNode && (
          <aside className="w-[440px] border-l border-teal-900/30 bg-slate-950/50 backdrop-blur-xl flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-500">
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-500 text-[10px] font-black uppercase tracking-widest">Node Depth: {selectedNode.level}</span>
                  <button onClick={() => setSelectedNode(null)} className="text-slate-600 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">{selectedNode.name}</h2>
                <ExpandableText text={selectedNode.description} />
              </div>

              {/* Mastery Toggle */}
              <button 
                onClick={handleToggleMastery}
                className={`w-full py-4 rounded-xl border font-bold flex items-center justify-center gap-3 transition-all ${
                  selectedNode.isMastered 
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-teal-500 hover:text-white'
                }`}
              >
                {selectedNode.isMastered ? (
                  <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Mastered</>
                ) : 'Mark as Mastered'}
              </button>

              {/* Socratic Challenge */}
              <div className="p-6 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-teal-500">✨</span>
                  <h3 className="text-xs font-black uppercase tracking-widest text-teal-500">Learning Challenge</h3>
                </div>
                
                {selectedNode.learningQuestion ? (
                  <div className="space-y-4 animate-in fade-in zoom-in-95">
                    <p className="text-lg font-medium text-teal-50 leading-snug">"{selectedNode.learningQuestion}"</p>
                    <div className="text-[10px] text-teal-600 font-bold italic tracking-wide">Take a moment to reason through this before moving on.</div>
                  </div>
                ) : (
                  <button 
                    onClick={handleSocraticChallenge}
                    disabled={selectedNode.isGeneratingQuestion}
                    className="w-full py-3 bg-teal-500/10 border border-teal-500/40 text-teal-400 rounded-lg text-xs font-bold hover:bg-teal-500/20 transition-all disabled:opacity-50"
                  >
                    {selectedNode.isGeneratingQuestion ? 'Generating Deep Question...' : 'Test My Understanding'}
                  </button>
                )}
              </div>

              {selectedNode.analogy && (
                <div className="space-y-2">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Conceptual Bridge</h3>
                   <p className="text-sm text-indigo-300 italic font-light leading-relaxed">"{selectedNode.analogy}"</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
