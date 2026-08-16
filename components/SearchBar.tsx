'use client';

import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => boolean; // Returns true if narrator is found and selected
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = 'Search by ID (e.g. 6) or Referral Code (e.g. U000006)...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError('Please enter a search query.');
      return;
    }

    const success = onSearch(trimmedQuery);
    if (!success) {
      setError(`No narrator found matching "${trimmedQuery}".`);
    } else {
      setQuery(''); // Clear query on success
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative flex items-center w-full">
        <div className="absolute left-4 text-zinc-700 dark:text-zinc-300 pointer-events-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          className="w-full py-3.5 pl-12 pr-28 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-450"
        />
        <button
          type="submit"
          className="absolute right-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-none transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        >
          Search
        </button>
      </form>
      {error && (
        <div className="mt-2.5 ml-2 text-xs font-medium text-rose-500 flex items-center gap-1.5 animate-fadeIn">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
