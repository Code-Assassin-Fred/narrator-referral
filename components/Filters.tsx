'use client';

import React from 'react';

export type FilterState = {
  minHours: number;
  maxHours: number;
  minClips: number;
  maxClips: number;
  maxDepth: number;
  rootCode: string;
  nodeType: 'all' | 'roots' | 'leaves' | 'has-children';
};

interface FiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  rootCodes: string[];
  onReset: () => void;
}

export default function Filters({ filters, onChange, rootCodes, onReset }: FiltersProps) {
  const handleNodeTypeChange = (type: FilterState['nodeType']) => {
    onChange({ ...filters, nodeType: type });
  };

  const handleInputChange = (field: keyof FilterState, value: any) => {
    onChange({ ...filters, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none p-4 sm:p-6 shadow-sm flex flex-col gap-5">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800/85">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Subtree Filters
        </h3>
        <button
          onClick={onReset}
          className="text-2xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors focus:outline-none"
        >
          Reset Filters
        </button>
      </div>

      {/* Filter 1: Root Tree Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
          Jump to Root Tree
        </label>
        <select
          value={filters.rootCode}
          onChange={(e) => handleInputChange('rootCode', e.target.value)}
          className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-200 transition-all"
        >
          <option value="">-- Select Root Tree --</option>
          {rootCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      {/* Filter 2: Max Depth Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Max Display Depth
          </label>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {filters.maxDepth} {filters.maxDepth === 1 ? 'level' : 'levels'}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={filters.maxDepth}
          onChange={(e) => handleInputChange('maxDepth', Number(e.target.value))}
          className="w-full accent-indigo-600 dark:accent-indigo-400"
        />
        <div className="flex justify-between text-3xs text-zinc-700 dark:text-zinc-300 px-0.5">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
        </div>
      </div>

      {/* Filter 3: Node Type Toggle Buttons */}
      <div className="flex flex-col gap-1.5">
        <label className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
          Node Role
        </label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-none">
          {(['all', 'roots', 'leaves', 'has-children'] as const).map((type) => {
            const isActive = filters.nodeType === type;
            const label = type === 'has-children' ? 'Parents' : type.charAt(0).toUpperCase() + type.slice(1);
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleNodeTypeChange(type)}
                className={`py-1.5 text-3xs font-bold rounded-none transition-all capitalize focus:outline-none ${
                  isActive
                    ? 'bg-white dark:bg-zinc-750 text-indigo-600 dark:text-indigo-300 shadow-sm border border-zinc-200 dark:border-zinc-600'
                    : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter 4: Accepted Hours Min/Max */}
      <div className="flex flex-col gap-1.5">
        <label className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
          Accepted Hours (Per Narrator)
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <span className="text-3xs text-zinc-700 dark:text-zinc-300">Min Hours</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.minHours === 0 ? '' : filters.minHours}
              onChange={(e) => handleInputChange('minHours', e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="0.0"
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-200"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xs text-zinc-700 dark:text-zinc-300">Max Hours</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.maxHours === Infinity ? '' : filters.maxHours}
              onChange={(e) => handleInputChange('maxHours', e.target.value === '' ? Infinity : Number(e.target.value))}
              placeholder="Max"
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </div>
      </div>

      {/* Filter 5: Accepted Clips Min/Max */}
      <div className="flex flex-col gap-1.5">
        <label className="text-2xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
          Accepted Clips (Per Narrator)
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <span className="text-3xs text-zinc-700 dark:text-zinc-300">Min Clips</span>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.minClips === 0 ? '' : filters.minClips}
              onChange={(e) => handleInputChange('minClips', e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-200"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xs text-zinc-700 dark:text-zinc-300">Max Clips</span>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.maxClips === Infinity ? '' : filters.maxClips}
              onChange={(e) => handleInputChange('maxClips', e.target.value === '' ? Infinity : Number(e.target.value))}
              placeholder="Max"
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
