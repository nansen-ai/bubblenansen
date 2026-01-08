import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphEdge } from '../types';

interface BubbleMapProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;
  onNodeClick: (node: GraphNode) => void;
  onNodeHover: (node: GraphNode | null) => void;
}

function getNodeColor(node: GraphNode): string {
  // Counterparty nodes get a cyan tint
  if (node.isCounterparty) {
    if (!node.label) return '#0e7490'; // cyan-700
    switch (node.label.type) {
      case 'exchange': return '#d97706'; // amber-600
      case 'defi': return '#2563eb'; // blue-600
      case 'fund': return '#7c3aed'; // violet-600
      case 'whale': return '#4f46e5'; // indigo-600
      case 'contract': return '#0891b2'; // cyan-600
      default: return '#0e7490';
    }
  }

  // Regular holder nodes
  if (!node.label) return '#4b5563'; // gray-600
  switch (node.label.type) {
    case 'exchange': return '#f59e0b'; // amber-500
    case 'defi': return '#3b82f6'; // blue-500
    case 'fund': return '#8b5cf6'; // violet-500
    case 'whale': return '#6366f1'; // indigo-500
    case 'contract': return '#06b6d4'; // cyan-500
    default: return '#4b5563';
  }
}

function getNodeRadius(node: GraphNode, radiusScale: d3.ScalePower<number, number, never>): number {
  if (node.isCounterparty) {
    // Counterparty nodes are smaller, based on interaction volume
    const baseSize = Math.log10(Math.max(node.valueUsd || 1000, 1000)) * 4;
    return Math.max(15, Math.min(baseSize, 30));
  }
  // Holder nodes sized by percentage ownership
  return radiusScale(node.percentage);
}

export function BubbleMap({ nodes, edges, selectedNode, onNodeClick, onNodeHover }: BubbleMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  // Store callbacks in refs so they don't trigger re-renders
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeHoverRef = useRef(onNodeHover);
  const selectedNodeRef = useRef(selectedNode);

  // Update refs when props change
  onNodeClickRef.current = onNodeClick;
  onNodeHoverRef.current = onNodeHover;
  selectedNodeRef.current = selectedNode;

  // Update selection styling without rebuilding graph
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll<SVGCircleElement, GraphNode>('circle')
      .attr('stroke', d => {
        if (d.id === selectedNode) return '#22d3ee';
        if (d.isCounterparty) return '#22d3ee';
        return '#1e1e2e';
      })
      .attr('stroke-width', d => {
        if (d.id === selectedNode) return 3;
        return 2;
      })
      .attr('stroke-dasharray', d => {
        if (d.id === selectedNode) return 'none';
        return d.isCounterparty ? '3,2' : 'none';
      });
  }, [selectedNode]);

  // Build the graph only when nodes/edges change
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous
    svg.selectAll('*').remove();

    // Create container for zoom
    const g = svg.append('g');

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    // Scale for bubble sizes (sqrt scale for area) - only for holders
    // Using sqrt scale so bubble AREA is proportional to holdings
    const holderNodes = nodes.filter(n => !n.isCounterparty);
    const maxPercentage = d3.max(holderNodes, d => d.percentage) || 1;
    const minPercentage = d3.min(holderNodes, d => d.percentage) || 0;
    const radiusScale = d3.scaleSqrt()
      .domain([minPercentage, maxPercentage])
      .range([15, 70]); // Larger range for more pronounced size differences

    // Clone nodes and edges for D3 mutation
    const nodesCopy: GraphNode[] = nodes.map(n => ({ ...n }));
    const edgesCopy: GraphEdge[] = edges.map(e => ({ ...e }));

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodesCopy)
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength((d) => {
        // Counterparties have less repulsion
        return (d as GraphNode).isCounterparty ? -50 : -120;
      }))
      .force('collide', d3.forceCollide<GraphNode>(d => getNodeRadius(d, radiusScale) + 4))
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edgesCopy)
        .id(d => d.id)
        .strength(0.5)
        .distance(80)
      );

    simulationRef.current = simulation;

    // Draw edges first (behind nodes)
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(edgesCopy)
      .join('line')
      .attr('stroke', '#22d3ee')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.max(1.5, Math.min(Math.log10(d.transfers + 1) * 2, 5)))
      .attr('stroke-dasharray', '4,2');

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodesCopy)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => getNodeRadius(d, radiusScale))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', d => {
        if (d.id === selectedNodeRef.current) return '#22d3ee';
        if (d.isCounterparty) return '#22d3ee';
        return '#1e1e2e';
      })
      .attr('stroke-width', d => {
        if (d.id === selectedNodeRef.current) return 3;
        if (d.isCounterparty) return 2;
        return 2;
      })
      .attr('stroke-dasharray', d => d.isCounterparty ? '3,2' : 'none')
      .attr('fill-opacity', d => d.isCounterparty ? 0.7 : 0.85);

    // Add labels to nodes that have a label name, or are large enough
    node.filter(d => {
      const radius = getNodeRadius(d, radiusScale);
      // Show label if: has a label name, OR is large enough (radius > 25)
      return d.label?.name || radius > 25;
    })
      .append('text')
      .text(d => {
        const name = d.label?.name || `${d.address.slice(0, 6)}...`;
        return name.length > 12 ? name.slice(0, 10) + '...' : name;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', d => {
        const radius = getNodeRadius(d, radiusScale);
        return Math.max(8, Math.min(radius / 3, 11));
      })
      .attr('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.8)');

    // Event handlers - use refs to avoid stale closures
    node
      .on('click', (_, d) => onNodeClickRef.current(d))
      .on('mouseenter', function(_, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('stroke', '#22d3ee')
          .attr('stroke-width', 3)
          .attr('stroke-dasharray', 'none');
        onNodeHoverRef.current(d);
      })
      .on('mouseleave', function(_, d) {
        const isSelected = d.id === selectedNodeRef.current;
        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('stroke', () => {
            if (isSelected) return '#22d3ee';
            if (d.isCounterparty) return '#22d3ee';
            return '#1e1e2e';
          })
          .attr('stroke-width', () => {
            if (isSelected) return 3;
            return 2;
          })
          .attr('stroke-dasharray', d.isCounterparty && !isSelected ? '3,2' : 'none');
        onNodeHoverRef.current(null);
      });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Reheat simulation when nodes/edges change
    simulation.alpha(0.5).restart();

    return () => {
      simulation.stop();
    };
  }, [nodes, edges]); // Only rebuild when nodes/edges change

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-background"
    />
  );
}
