'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TreeNode, findNarrator } from '../lib/tree';
import { FilterState } from './Filters';

interface ReferralTreeProps {
  treeData: TreeNode;
  filters: FilterState;
  onSelectNarrator: (id: number) => void;
}

export default function ReferralTree({ treeData, filters, onSelectNarrator }: ReferralTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Tooltip/Card detail state
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    node: any;
  } | null>(null);

  // Helper to determine if a node matches the filters (for dimming)
  const matchesFilters = (n: any) => {
    // Hours filter
    if (n.hours < filters.minHours || n.hours > filters.maxHours) return false;
    // Clips filter
    if (n.clips < filters.minClips || n.clips > filters.maxClips) return false;
    
    // Node role filter
    const hasChildren = (n.children && n.children.length > 0) || (n._children && n._children.length > 0);
    if (filters.nodeType === 'roots' && n.parentId !== null) return false;
    if (filters.nodeType === 'leaves' && hasChildren) return false;
    if (filters.nodeType === 'has-children' && !hasChildren) return false;
    
    return true;
  };

  useEffect(() => {
    if (!svgRef.current || !treeData) return;

    // Reset tooltip when tree data changes
    setActiveTooltip(null);

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Create a group for all graph elements
    const g = svg.append('g')
      .attr('class', 'tree-group');

    // Configure D3 Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Filter tree structure by maxDepth filter before feeding to D3 hierarchy
    const truncateTree = (node: TreeNode, currentDepth: number, maxD: number): any => {
      const cloned = { ...node, children: [] as any[] };
      if (currentDepth < maxD && node.children) {
        cloned.children = node.children.map(child => truncateTree(child, currentDepth + 1, maxD));
      }
      return cloned;
    };

    const truncatedData = truncateTree(treeData, 0, filters.maxDepth);

    // Compute maxHours in this local subtree for dynamic color scaling
    let maxSubtreeHours = 0;
    const findMaxHours = (n: any) => {
      if (n.hours > maxSubtreeHours) maxSubtreeHours = n.hours;
      if (n.children) n.children.forEach(findMaxHours);
    };
    findMaxHours(truncatedData);

    // High performance border scale (Slate grey -> Indigo -> Vibrant Violet-Rose)
    const colorScale = d3.scaleLinear<string>()
      .domain([0, maxSubtreeHours / 2 || 0.5, maxSubtreeHours || 1])
      .range(['#94a3b8', '#6366f1', '#ec4899']); // slate-400 -> indigo-500 -> pink-500

    // Setup hierarchy
    const root: any = d3.hierarchy(truncatedData);
    
    // Default collapsed behavior: expand root and its direct children, collapse deeper levels
    root.descendants().forEach((d: any) => {
      // If the node is depth 1 or deeper relative to the selected root, collapse its children by default
      if (d.depth >= 1 && d.children) {
        d._children = d.children;
        d.children = null;
      }
    });

    // Node card dimensions
    const nodeWidth = 180;
    const nodeHeight = 60;

    // Define tree layout (horizontal spacing is nodeWidth + padding, vertical spacing is nodeHeight + padding)
    const treeLayout = d3.tree()
      .nodeSize([80, 240]); // [height_spacing, width_spacing]

    // Initial position of root
    root.x0 = height / 2;
    root.y0 = 50;

    // Center root initially
    const initialTransform = d3.zoomIdentity.translate(80, height / 2 - 30).scale(0.85);
    svg.call(zoom.transform, initialTransform);

    // Update function to handle expand/collapse animations
    function update(source: any) {
      // Compute the new tree layout.
      const nodes = treeLayout(root).descendants();
      const links = root.links();

      // Normalize for fixed-depth horizontal layout.
      nodes.forEach((d: any) => {
        d.y = d.depth * 250;
      });

      // Update the nodes...
      const node = g.selectAll('g.node')
        .data(nodes, (d: any) => d.data.id);

      // Enter any new nodes at the parent's previous position.
      const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', () => `translate(${source.y0},${source.x0})`)
        .on('click', function(event, d: any) {
          // Prevent double trigger on collapse button vs body clicks
          // We will handle specific clicks on the card vs collapse button
        });

      // Node Card (rounded rect)
      nodeEnter.append('rect')
        .attr('class', 'node-card cursor-pointer')
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', 0)
        .attr('ry', 0)
        .attr('x', 0)
        .attr('y', -nodeHeight / 2)
        .attr('fill', '#ffffff') // Set via Tailwind or CSS dynamically
        .attr('stroke-width', 2)
        .attr('filter', 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))')
        .on('click', (event, d: any) => {
          event.stopPropagation();
          // Show tooltip detailing this narrator
          const clientRect = event.currentTarget.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();
          
          if (containerRect) {
            setActiveTooltip({
              x: clientRect.left - containerRect.left + nodeWidth / 2,
              y: clientRect.top - containerRect.top + nodeHeight + 10,
              node: d.data
            });
          }
        });

      // Glow indicators for high performers (accepted hours > 2.0)
      nodeEnter.append('circle')
        .attr('cx', 12)
        .attr('cy', 0)
        .attr('r', 4)
        .attr('fill', (d: any) => d.data.hours > 2.0 ? '#ec4899' : 'transparent')
        .attr('class', 'animate-pulse');

      // Left bar in the card for accent performance color
      nodeEnter.append('rect')
        .attr('width', 5)
        .attr('height', nodeHeight - 4)
        .attr('rx', 0)
        .attr('ry', 0)
        .attr('x', 2)
        .attr('y', -nodeHeight / 2 + 2)
        .attr('fill', (d: any) => colorScale(d.data.hours));

      // Narrator Name / Code Text
      nodeEnter.append('text')
        .attr('x', 14)
        .attr('y', -8)
        .attr('class', 'text-xs font-bold font-sans fill-zinc-950 dark:fill-zinc-50 select-none')
        .text((d: any) => {
          const name = d.data.name;
          if (!name) return d.data.code;
          return name.length > 20 ? name.slice(0, 18) + '...' : name;
        });

      // Secondary Text (Code if Name is present)
      nodeEnter.append('text')
        .attr('x', 14)
        .attr('y', 8)
        .attr('class', 'text-[10px] font-mono fill-zinc-700 dark:fill-zinc-300 select-none')
        .text((d: any) => d.data.name ? d.data.code : 'No Name');

      // Metrics badge (Hours / Clips)
      nodeEnter.append('text')
        .attr('x', 14)
        .attr('y', 20)
        .attr('class', 'text-[10px] font-semibold font-sans fill-indigo-600 dark:fill-indigo-400 select-none')
        .text((d: any) => `${d.data.hours.toFixed(2)}h • ${d.data.clips}c`);

      // Expand/Collapse Circle Button on the right edge
      const collapseBtn = nodeEnter.append('g')
        .attr('class', 'collapse-btn cursor-pointer')
        .attr('transform', `translate(${nodeWidth}, 0)`)
        .on('click', (event, d: any) => {
          event.stopPropagation();
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          setActiveTooltip(null); // Close tooltip on layout change
          update(d);
        });

      collapseBtn.append('circle')
        .attr('r', 8)
        .attr('fill', '#6366f1')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);

      collapseBtn.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '.3em')
        .attr('class', 'text-[10px] font-bold fill-white select-none')
        .text((d: any) => (d.children || d._children) ? (d.children ? '-' : '+') : '');

      // Hide collapse button for leaf nodes
      collapseBtn.style('display', (d: any) => (d.children || d._children) ? 'block' : 'none');

      // Transition nodes to their new position.
      const nodeUpdate = node.merge(nodeEnter as any).transition()
        .duration(300)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

      // Update Node Card Styling (Colors, dark mode background compatibility)
      nodeUpdate.select('rect.node-card')
        .attr('stroke', (d: any) => colorScale(d.data.hours))
        .attr('fill', '#ffffff'); // Use simple white card. In Dark Mode, Tailwind class can adjust it via CSS, but let's hardcode a beautiful dark/light border.

      // Apply dimming if node does not match filters
      node.merge(nodeEnter as any)
        .style('opacity', (d: any) => matchesFilters(d.data) ? 1 : 0.25)
        .style('filter', (d: any) => matchesFilters(d.data) ? 'none' : 'grayscale(60%)');

      // Transition exiting nodes to the parent's new position.
      const nodeExit = node.exit().transition()
        .duration(300)
        .attr('transform', () => `translate(${source.y},${source.x})`)
        .remove();

      nodeExit.select('rect')
        .attr('width', 0)
        .attr('height', 0);

      nodeExit.select('text')
        .style('fill-opacity', 0);

      // Update the links...
      const link = g.selectAll('path.link')
        .data(links, (d: any) => d.target.id);

      // Enter any new links at the parent's previous position.
      const linkEnter = link.enter().insert('path', 'g')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#cbd5e1') // slate-300
        .attr('stroke-width', 2)
        .attr('d', () => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal(o, o);
        });

      // Transition links to their new position.
      const linkUpdate = link.merge(linkEnter as any);
      
      linkUpdate.transition()
        .duration(300)
        .attr('stroke', '#cbd5e1')
        .attr('d', (d: any) => diagonal(d.source, d.target));

      // Dim links if target node is dimmed
      linkUpdate.style('opacity', (d: any) => matchesFilters(d.target.data) ? 0.8 : 0.2);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
        .duration(300)
        .attr('d', () => {
          const o = { x: source.x, y: source.y };
          return diagonal(o, o);
        })
        .remove();

      // Store the old positions for transition.
      nodes.forEach((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });

      // Creates a curved (diagonal) path from parent to the child nodes.
      function diagonal(s: any, d: any) {
        // Adjust paths to connect to card edges rather than node centers.
        // Source node output is at (s.y + nodeWidth, s.x)
        // Target node input is at (d.y, d.x)
        const sy = s.y + nodeWidth;
        const sx = s.x;
        const dy = d.y;
        const dx = d.x;

        return `M ${sy} ${sx}
                C ${(sy + dy) / 2} ${sx},
                  ${(sy + dy) / 2} ${dx},
                  ${dy} ${dx}`;
      }
    }

    update(root);

  }, [treeData, filters]);

  // Click outside to dismiss tooltip
  const handleSvgClick = () => {
    setActiveTooltip(null);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[400px] sm:h-[600px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none overflow-hidden shadow-inner"
      onClick={handleSvgClick}
    >
      {/* Zoom / Pan Help Indicator */}
      <div className="absolute top-4 left-4 pointer-events-none select-none flex items-center gap-2 px-3 py-1.5 rounded-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-3xs font-semibold text-zinc-700 dark:text-zinc-300">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 9.152c.582.448 1.148.89 1.676 1.345m-1.676-1.345c-.58-.447-1.137-.883-1.666-1.327m1.666 1.327c.489.376.953.743 1.392 1.1m0 0C17.76 11.233 19 12.87 19 14.75v.25M15.042 9.152c-.524-.403-1.036-.788-1.536-1.155m1.536 1.155c-.489.376-.953.743-1.392 1.1m0 0C12.24 11.233 11 12.87 11 14.75v.25m3.75-5.848c-.628-.483-1.229-.943-1.802-1.38M12.5 15.25h5.5m-5.5 0a2.25 2.25 0 00-2.25 2.25v2.25a2.25 2.25 0 002.25 2.25h5.5a2.25 2.25 0 002.25-2.25v-2.25a2.25 2.25 0 00-2.25-2.25m-10.5-6h5.5" />
        </svg>
        Pinch / Drag to Zoom & Pan
      </div>

      <svg 
        ref={svgRef} 
        className="w-full h-full block dark:bg-zinc-950"
      />

      {/* Floating Detailed Node Tooltip / Context Action */}
      {activeTooltip && (
        <div 
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          style={{ 
            left: `${activeTooltip.x}px`, 
            top: `${activeTooltip.y}px` 
          }}
          className="absolute z-30 w-64 -translate-x-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none p-4 shadow-xl flex flex-col gap-3 animate-fadeIn text-left"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                {activeTooltip.node.name || 'Anonymous'}
              </p>
              <p className="text-3xs font-mono text-zinc-700 dark:text-zinc-300 mt-0.5">
                Code: {activeTooltip.node.code}
              </p>
            </div>
            <button 
              onClick={() => setActiveTooltip(null)}
              className="text-zinc-700 dark:text-zinc-350 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-3xs text-zinc-700 dark:text-zinc-300">
            <div>
              <p className="font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-0.5">Hours</p>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{activeTooltip.node.hours.toFixed(3)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-0.5">Clips</p>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{activeTooltip.node.clips}</p>
            </div>
            {activeTooltip.node.phone && (
              <div className="col-span-2 mt-1">
                <p className="font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-0.5">Phone</p>
                <p className="text-2xs font-mono text-zinc-900 dark:text-zinc-100">{activeTooltip.node.phone}</p>
              </div>
            )}
          </div>

          {/* Drill-down Action Button */}
          <button
            onClick={() => {
              onSelectNarrator(activeTooltip.node.id);
              setActiveTooltip(null);
            }}
            className="w-full mt-1.5 py-2 text-center text-2xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-none transition-all shadow-sm focus:outline-none"
          >
            Focus & Drill Down
          </button>
        </div>
      )}
    </div>
  );
}
