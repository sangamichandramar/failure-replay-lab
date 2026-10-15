import React from 'react';

/**
 * Service Node Layout Coordinates in SVG coordinate space (800 x 420)
 * Top-down architectural tier layout:
 * Tier 0 (Client): Frontend (x: 400, y: 45)
 * Tier 1 (Gateway): API Gateway (x: 400, y: 135)
 * Tier 2 (Application Services): Auth Service (x: 230, y: 235), Order Service (x: 570, y: 235)
 * Tier 3 (Data & Cache): Cache Service (x: 250, y: 345), Database (x: 550, y: 345)
 */
const NODE_COORDINATES = {
  'Frontend': { x: 400, y: 45, width: 140, height: 48 },
  'API Gateway': { x: 400, y: 135, width: 150, height: 48 },
  'Authentication Service': { x: 230, y: 235, width: 190, height: 48 },
  'Order Service': { x: 570, y: 235, width: 160, height: 48 },
  'Cache Service': { x: 260, y: 345, width: 160, height: 48 },
  'Database': { x: 540, y: 345, width: 160, height: 48 },
};

/**
 * Architectural Dependency Edges: [fromService, toService]
 * An arrow from A to B means "A depends on B" (calls B)
 */
const EDGES = [
  { from: 'Frontend', to: 'API Gateway' },
  { from: 'API Gateway', to: 'Authentication Service' },
  { from: 'API Gateway', to: 'Order Service' },
  { from: 'Authentication Service', to: 'Database' },
  { from: 'Authentication Service', to: 'Cache Service' },
  { from: 'Order Service', to: 'Database' },
  { from: 'Order Service', to: 'Cache Service' },
];

export default function DependencyGraph({
  activeStatuses = {},
  onSelectService,
  selectedService = null,
  highlightedServices = []
}) {

  // Helper to determine fill, stroke, and glow based on dynamic status
  const getStatusColors = (status) => {
    switch ((status || 'healthy').toLowerCase()) {
      case 'failed':
        return {
          fill: '#2a0808',
          stroke: '#ef4444',
          text: '#fca5a5',
          dot: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.4)'
        };
      case 'degraded':
        return {
          fill: '#2a1a05',
          stroke: '#f59e0b',
          text: '#fde68a',
          dot: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.4)'
        };
      case 'affected':
        return {
          fill: '#1b122e',
          stroke: '#8b5cf6',
          text: '#c4b5fd',
          dot: '#8b5cf6',
          glow: 'rgba(139, 92, 246, 0.4)'
        };
      case 'healthy':
      default:
        return {
          fill: '#06231a',
          stroke: '#10b981',
          text: '#6ee7b7',
          dot: '#10b981',
          glow: 'rgba(16, 185, 129, 0.2)'
        };
    }
  };

  return (
    <div className="dependency-graph-container" style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox="0 0 800 420"
        className="dep-graph-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Arrow markers for edges */}
          <marker
            id="arrowhead-default"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#334155" />
          </marker>
          <marker
            id="arrowhead-danger"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#ef4444" />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" />
          </marker>
        </defs>

        {/* 1. Dependency Edges */}
        {EDGES.map((edge, index) => {
          const fromCoord = NODE_COORDINATES[edge.from];
          const toCoord = NODE_COORDINATES[edge.to];
          if (!fromCoord || !toCoord) return null;

          const startX = fromCoord.x;
          const startY = fromCoord.y + fromCoord.height / 2;
          const endX = toCoord.x;
          const endY = toCoord.y - toCoord.height / 2;

          const fromStatus = (activeStatuses[edge.from] || 'healthy').toLowerCase();
          const toStatus = (activeStatuses[edge.to] || 'healthy').toLowerCase();
          const isDanger = toStatus === 'failed' || fromStatus === 'failed';
          const isActive = toStatus !== 'healthy' || fromStatus !== 'healthy';

          // Bezier curve calculation
          const midY = (startY + endY) / 2;
          const pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 6}`;

          return (
            <g key={`edge-${index}`}>
              <path
                d={pathD}
                className={`graph-edge ${isDanger ? 'edge-danger' : isActive ? 'edge-active' : ''}`}
                markerEnd={isDanger ? 'url(#arrowhead-danger)' : isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead-default)'}
              />
            </g>
          );
        })}

        {/* 2. Service Nodes */}
        {Object.entries(NODE_COORDINATES).map(([name, coords]) => {
          const status = activeStatuses[name] || 'healthy';
          const colors = getStatusColors(status);
          const isSelected = selectedService === name;
          const isHighlighted = highlightedServices.includes(name);

          const rectX = coords.x - coords.width / 2;
          const rectY = coords.y - coords.height / 2;

          return (
            <g
              key={name}
              className="graph-node"
              onClick={() => onSelectService && onSelectService(name)}
              transform={isSelected ? `scale(1.04) translate(${coords.x * -0.04}, ${coords.y * -0.04})` : ''}
            >
              {/* Pulsing halo if failed or degraded */}
              {(status === 'failed' || status === 'degraded') && (
                <rect
                  x={rectX - 4}
                  y={rectY - 4}
                  width={coords.width + 8}
                  height={coords.height + 8}
                  rx="12"
                  ry="12"
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="2"
                  opacity="0.6"
                >
                  <animate
                    attributeName="opacity"
                    values="0.8;0.1;0.8"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="transform"
                    type="scale"
                    values="1;1.02;1"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </rect>
              )}

              {/* Main Node Background Box */}
              <rect
                x={rectX}
                y={rectY}
                width={coords.width}
                height={coords.height}
                className="graph-node-rect"
                fill={colors.fill}
                stroke={isSelected ? '#3b82f6' : colors.stroke}
                strokeWidth={isSelected ? '3' : isHighlighted ? '2.5' : '1.5'}
                style={{
                  filter: `drop-shadow(0 0 8px ${colors.glow})`,
                }}
              />

              {/* Status Indicator Dot */}
              <circle
                cx={rectX + 16}
                cy={coords.y}
                r="4.5"
                fill={colors.dot}
              />

              {/* Service Title */}
              <text
                x={rectX + 28}
                y={coords.y - 2}
                fill="#ffffff"
                fontSize="12.5"
                fontWeight="600"
                alignmentBaseline="middle"
                style={{ pointerEvents: 'none' }}
              >
                {name}
              </text>

              {/* Status Subtitle Text */}
              <text
                x={rectX + 28}
                y={coords.y + 13}
                fill={colors.text}
                fontSize="9.5"
                fontWeight="500"
                textAnchor="start"
                textTransform="uppercase"
                letterSpacing="0.05em"
                style={{ pointerEvents: 'none' }}
              >
                {status}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '10px',
        fontSize: '0.76rem',
        color: 'var(--text-muted)'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Healthy
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> Degraded
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Failed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></span> Affected
        </span>
      </div>
    </div>
  );
}
