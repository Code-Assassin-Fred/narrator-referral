'use client';

import React, { useState, useMemo } from 'react';
import narratorsData from '../data/narrators.json';
import { Narrator, TreeNode, getSubtree, findNarrator, getSubtreeStats } from '../lib/tree';
import SearchBar from '../components/SearchBar';
import StatsPanel from '../components/StatsPanel';
import Filters, { FilterState } from '../components/Filters';
import ReferralTree from '../components/ReferralTree';

const ALL_NARRATORS = narratorsData as Narrator[];

// Default filter values
const DEFAULT_FILTERS: FilterState = {
  minHours: 0,
  maxHours: Infinity,
  minClips: 0,
  maxClips: Infinity,
  maxDepth: 5,
  rootCode: '',
  nodeType: 'all',
};

type SortColumn = 'code' | 'name' | 'descendants' | 'hours' | 'clips';
type SortDir = 'asc' | 'desc';

export default function Home() {
  const [activeNarratorId, setActiveNarratorId] = useState<number | null>(null);
  
  // Drill-down mode filters state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Browse Mode Search & Sort state
  const [browseSearch, setBrowseSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('hours');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Dynamic Root Code list for filters
  const rootCodes = useMemo(() => {
    return Array.from(new Set(ALL_NARRATORS.map(n => n.rootCode))).filter(Boolean).sort();
  }, []);

  // Precompute Root Tree Subtree Stats for Browse Mode
  const rootTreeStats = useMemo(() => {
    const roots = ALL_NARRATORS.filter(n => n.parentId === null);
    return roots.map(root => {
      const subtree = getSubtree(ALL_NARRATORS, root.id);
      const stats = subtree ? getSubtreeStats(subtree) : { totalDescendants: 0, totalHours: 0, totalClips: 0 };
      return {
        id: root.id,
        code: root.code,
        name: root.name,
        descendants: stats.totalDescendants,
        hours: stats.totalHours,
        clips: stats.totalClips,
      };
    });
  }, []);

  // Filtered & Sorted Root Trees for Browse Mode Table
  const filteredAndSortedRoots = useMemo(() => {
    // 1. Filter roots
    let list = rootTreeStats;
    if (browseSearch.trim()) {
      const query = browseSearch.toLowerCase();
      list = list.filter(r => 
        r.code.toLowerCase().includes(query) || 
        (r.name && r.name.toLowerCase().includes(query))
      );
    }

    // 2. Sort roots
    return list.sort((a, b) => {
      let aVal: any = a[sortCol];
      let bVal: any = b[sortCol];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal === null || aVal === undefined) return sortDir === 'asc' ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortDir === 'asc' ? 1 : -1;

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rootTreeStats, browseSearch, sortCol, sortDir]);

  // Active narrator node details
  const activeNarrator = useMemo(() => {
    if (activeNarratorId === null) return null;
    return findNarrator(ALL_NARRATORS, activeNarratorId);
  }, [activeNarratorId]);

  // Active subtree (full tree) starting from active narrator
  const activeSubtree = useMemo(() => {
    if (activeNarratorId === null) return null;
    return getSubtree(ALL_NARRATORS, activeNarratorId);
  }, [activeNarratorId]);

  // Search execution handler (returns true if found, false if not)
  const handleSearch = (query: string): boolean => {
    const found = findNarrator(ALL_NARRATORS, query);
    if (found) {
      setActiveNarratorId(found.id);
      
      // Update filters to align with selection if changing trees
      setFilters(prev => ({
        ...prev,
        rootCode: found.rootCode || prev.rootCode,
      }));
      return true;
    }
    return false;
  };

  // Switch root code filter (causes visualizer to jump to the root of that code)
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    
    // If the rootCode is changed, we want to jump focus directly to that root narrator
    if (newFilters.rootCode !== filters.rootCode && newFilters.rootCode !== '') {
      const rootNode = ALL_NARRATORS.find(n => n.code === newFilters.rootCode && n.parentId === null);
      if (rootNode) {
        setActiveNarratorId(rootNode.id);
      }
    }
  };

  // Breadcrumb Trail back up to Root Node
  const breadcrumbs = useMemo(() => {
    if (!activeNarrator) return [];
    const chain: Narrator[] = [activeNarrator];
    let current = activeNarrator;
    while (current.parentId !== null) {
      const parent = findNarrator(ALL_NARRATORS, current.parentId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }
    return chain;
  }, [activeNarrator]);

  const handleSort = (column: SortColumn) => {
    if (sortCol === column) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(column);
      setSortDir('desc');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Header bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-zinc-950 dark:text-zinc-50">
              Narrator Referral Tree
            </h1>
            <p className="text-3xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest mt-0.5">
              Referral Network Analytics
            </p>
          </div>
        </div>
        
        {/* Core Search Utility */}
        <div className="w-full md:w-96">
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col">
        {activeSubtree === null ? (
          /* BROWSE MODE (Table listing the 203 root trees) */
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none p-6">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50">
                  Browse Root Signup Trees
                </h2>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                  There are {rootTreeStats.length} top-level root signups. Compare the overall network value and size of each root tree.
                </p>
              </div>

              {/* Table Filter Input */}
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  placeholder="Filter roots by code/name..."
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  className="w-full py-2 pl-9 pr-4 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-200"
                />
                <div className="absolute left-3 top-2.5 text-zinc-700 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v.744c0 .839-.333 1.644-.926 2.238l-4.148 4.148A4.5 4.5 0 0114.75 15v1.804a2.25 2.25 0 01-.659 1.591l-1.5 1.5A2.25 2.25 0 018.75 19.304V15a4.5 4.5 0 01-1.174-3.123L3.428 7.728A3.078 3.078 0 012.5 5.518v-.744c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Root Signups Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-2xs font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      <th className="py-4 px-3 sm:px-6 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('code')}>
                        <div className="flex items-center gap-1">
                          Root Code
                          {sortCol === 'code' && (sortDir === 'asc' ? ' 🔼' : ' 🔽')}
                        </div>
                      </th>
                      <th className="py-4 px-3 sm:px-6 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Root Name
                          {sortCol === 'name' && (sortDir === 'asc' ? ' 🔼' : ' 🔽')}
                        </div>
                      </th>
                      <th className="py-4 px-3 sm:px-6 text-right cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('descendants')}>
                        <div className="flex items-center justify-end gap-1">
                          Total Descendants
                          {sortCol === 'descendants' && (sortDir === 'asc' ? ' 🔼' : ' 🔽')}
                        </div>
                      </th>
                      <th className="py-4 px-3 sm:px-6 text-right cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('hours')}>
                        <div className="flex items-center justify-end gap-1">
                          Total Tree Hours
                          {sortCol === 'hours' && (sortDir === 'asc' ? ' 🔼' : ' 🔽')}
                        </div>
                      </th>
                      <th className="py-4 px-3 sm:px-6 text-right cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('clips')}>
                        <div className="flex items-center justify-end gap-1">
                          Total Tree Clips
                          {sortCol === 'clips' && (sortDir === 'asc' ? ' 🔼' : ' 🔽')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                    {filteredAndSortedRoots.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-zinc-400 dark:text-zinc-500 font-medium">
                          No root trees found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedRoots.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => {
                            setActiveNarratorId(row.id);
                            setFilters({ ...DEFAULT_FILTERS, rootCode: row.code });
                          }}
                          className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 cursor-pointer transition-colors"
                        >
                          <td className="py-4 px-3 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {row.code}
                          </td>
                          <td className="py-4 px-3 sm:px-6 font-bold text-zinc-900 dark:text-zinc-100">
                            {row.name || 'Anonymous'}
                          </td>
                          <td className="py-4 px-3 sm:px-6 text-right font-semibold text-zinc-800 dark:text-zinc-200">
                            {row.descendants}
                          </td>
                          <td className="py-4 px-3 sm:px-6 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {row.hours.toFixed(2)} hrs
                          </td>
                          <td className="py-4 px-3 sm:px-6 text-right font-semibold text-violet-600 dark:text-violet-400">
                            {row.clips.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* DRILL-DOWN MODE (Tree Diagram + Stats + Filters) */
          <div className="flex flex-col gap-6 animate-fadeIn">
            {/* Breadcrumb Navigation Trail */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none p-4 px-6">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => {
                    setActiveNarratorId(null);
                    setFilters(DEFAULT_FILTERS);
                  }}
                  className="flex items-center gap-1 text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50 font-bold transition-colors"
                >
                  Browse Roots
                </button>
                {breadcrumbs.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    <span className="text-zinc-500 dark:text-zinc-500">/</span>
                    <button
                      onClick={() => setActiveNarratorId(node.id)}
                      disabled={idx === breadcrumbs.length - 1}
                      className={`font-semibold transition-colors ${
                        idx === breadcrumbs.length - 1
                          ? 'text-indigo-600 dark:text-indigo-400 font-bold cursor-default'
                          : 'text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50'
                      }`}
                    >
                      {node.name || node.code}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Close Button / Return to list */}
              <button
                onClick={() => {
                  setActiveNarratorId(null);
                  setFilters(DEFAULT_FILTERS);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-2xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-none transition-all shadow-sm focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back to Browse
              </button>
            </div>

            {/* Tree View layout grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: Filters and Stats Panel */}
              <div className="lg:col-span-1 flex flex-col gap-6 order-2 lg:order-1">
                <StatsPanel activeNode={activeSubtree} filters={filters} />
                <Filters
                  filters={filters}
                  onChange={handleFilterChange}
                  rootCodes={rootCodes}
                  onReset={() => setFilters({ ...DEFAULT_FILTERS, rootCode: activeNarrator?.rootCode || '' })}
                />
              </div>

              {/* Right Column: D3 Interactive Tree */}
              <div className="lg:col-span-3 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none p-4 sm:p-6 shadow-sm min-h-[500px] order-1 lg:order-2">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-extrabold text-zinc-900 dark:text-zinc-50 text-base">
                      Interactive Referral Tree Map
                    </h3>
                    <p className="text-3xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest mt-0.5">
                      Visualizing depth and performance metrics
                    </p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none">
                    Focus: {activeNarrator?.code}
                  </span>
                </div>

                <div className="flex-1 w-full">
                  <ReferralTree
                    treeData={activeSubtree}
                    filters={filters}
                    onSelectNarrator={setActiveNarratorId}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
