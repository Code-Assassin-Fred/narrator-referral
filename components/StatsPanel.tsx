'use client';

import React, { useMemo } from 'react';
import { TreeNode, getSubtreeStats, getPerLevelStats } from '../lib/tree';
import { FilterState } from './Filters';

interface StatsPanelProps {
  activeNode: TreeNode;
  filters: FilterState;
}

export default function StatsPanel({ activeNode, filters }: StatsPanelProps) {
  const stats = getSubtreeStats(activeNode);

  // Filter predicate matching the same logic used by ReferralTree for dimming
  const matchesFilters = (n: TreeNode): boolean => {
    if (n.hours < filters.minHours || n.hours > filters.maxHours) return false;
    if (n.clips < filters.minClips || n.clips > filters.maxClips) return false;
    const hasChildren = n.children && n.children.length > 0;
    if (filters.nodeType === 'roots' && n.parentId !== null) return false;
    if (filters.nodeType === 'leaves' && hasChildren) return false;
    if (filters.nodeType === 'has-children' && !hasChildren) return false;
    return true;
  };

  const levelStats = useMemo(
    () => getPerLevelStats(activeNode, matchesFilters),
    [activeNode, filters]
  );

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none p-4 sm:p-6 shadow-sm flex flex-col gap-6">
      {/* Selected Narrator Profile Card */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-3">
          Active Narrator Focus
        </h3>
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-none p-4 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">
                {activeNode.name || 'Anonymous Narrator'}
              </p>
              <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 mt-0.5">
                Code: {activeNode.code}
              </p>
            </div>
            <span className="px-2.5 py-1 text-2xs font-bold bg-indigo-600 dark:bg-indigo-700 text-white border-0 rounded-none">
              Depth {activeNode.depth}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Own Hours
              </p>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {activeNode.hours.toFixed(3)} hrs
              </p>
            </div>
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Own Clips
              </p>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {activeNode.clips}
              </p>
            </div>
          </div>

          {activeNode.phone && (
            <div className="mt-1 pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 text-2xs text-zinc-700 dark:text-zinc-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.806-5.194-4.178-7-7l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              {activeNode.phone}
            </div>
          )}
        </div>
      </div>

      {/* Referral Hierarchy Stats */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-3">
          Referral Network Metrics
        </h3>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Card 1: Direct Children */}
          <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none p-3">
            <p className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-0.5">
              Direct Children
            </p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.directChildrenCount}
            </p>
          </div>

          {/* Card 2: Total Descendants */}
          <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none p-3">
            <p className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-0.5">
              Total Descendants
            </p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.totalDescendants}
            </p>
          </div>

          {/* Card 3: Max Depth Below */}
          <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none p-3 col-span-2">
            <div className="flex justify-between items-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Max Chain Depth Below
              </p>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.maxDepthBelow} levels
              </p>
            </div>
            {/* Simple visual depth meter */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-none mt-2 overflow-hidden">
              <div 
                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-none transition-all duration-500" 
                style={{ width: `${Math.min(100, (stats.maxDepthBelow / 5) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Aggregated Performance Sums */}
        <div className="flex flex-col gap-3">
          {/* Hours Box */}
          <div className="border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950 rounded-none p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-emerald-500" />
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Accepted Hours Summary
              </p>
            </div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-2xs text-zinc-700 dark:text-zinc-300">Subtree Total (incl. self)</span>
              <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-lg">
                {stats.totalHours.toFixed(3)} hrs
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-2xs text-zinc-700 dark:text-zinc-300">Descendants Only (excl. self)</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                {stats.descendantHours.toFixed(3)} hrs
              </span>
            </div>
          </div>

          {/* Clips Box */}
          <div className="border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950 rounded-none p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-violet-500" />
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Accepted Clips Summary
              </p>
            </div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-2xs text-zinc-700 dark:text-zinc-300">Subtree Total (incl. self)</span>
              <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-lg">
                {stats.totalClips.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-2xs text-zinc-700 dark:text-zinc-300">Descendants Only (excl. self)</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                {stats.descendantClips.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Per-Level Breakdown Table */}
        {levelStats.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 bg-amber-500" />
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Per-Level Breakdown
              </p>
            </div>
            <div className="border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 rounded-none overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-0">
                <thead>
                  <tr className="border-b border-amber-200 dark:border-amber-800">
                    <th className="py-1.5 px-2 text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                      Lvl
                    </th>
                    <th className="py-1.5 px-2 text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 text-right">
                      People
                    </th>
                    <th className="py-1.5 px-2 text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 text-right">
                      Hours
                    </th>
                    <th className="py-1.5 px-2 text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 text-right">
                      Clips
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 dark:divide-amber-900">
                  {levelStats.map((row) => (
                    <tr key={row.level} className="hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-colors">
                      <td className="py-1.5 px-2 text-xs font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        L{row.level}
                        <span className="ml-0.5 text-3xs font-normal text-zinc-600 dark:text-zinc-400">
                          {row.level === 1 ? 'child' : row.level === 2 ? 'g.child' : ''}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 text-right">
                        {row.people}
                      </td>
                      <td className="py-1.5 px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-right">
                        {row.hours.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2 text-xs font-semibold text-violet-700 dark:text-violet-400 text-right">
                        {row.clips.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
