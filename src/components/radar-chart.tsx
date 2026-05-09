"use client";

interface RadarChartProps {
  scores: {
    faceShapeMatch: number;
    hairTextureMatch: number;
    styleVibe: number;
    emotionalValue: number;
    proKnowledge: number;
    humorInteraction: number;
  };
  size?: number;
}

const LABELS = [
  { key: "faceShapeMatch", label: "脸型适配" },
  { key: "hairTextureMatch", label: "发质匹配" },
  { key: "styleVibe", label: "风格气质" },
  { key: "emotionalValue", label: "情绪价值" },
  { key: "proKnowledge", label: "专业冷知识" },
  { key: "humorInteraction", label: "幽默互动" },
];

export function RadarChart({ scores, size = 200 }: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.38;
  const levels = 5;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const gridPolygons = Array.from({ length: levels }, (_, i) => {
    const value = ((i + 1) / levels) * 100;
    const points = LABELS.map((_, idx) => {
      const p = getPoint(idx, value);
      return `${p.x},${p.y}`;
    }).join(" ");
    return <polygon key={i} points={points} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
  });

  const dataPoints = LABELS.map((item, idx) =>
    getPoint(idx, scores[item.key as keyof typeof scores])
  );
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridPolygons}
      {/* Axes */}
      {LABELS.map((_, idx) => {
        const end = getPoint(idx, 100);
        return (
          <line
            key={idx}
            x1={center}
            y1={center}
            x2={end.x}
            y2={end.y}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}
      {/* Data area */}
      <polygon
        points={dataPolygon}
        fill="rgba(224, 108, 92, 0.2)"
        stroke="#e06c5c"
        strokeWidth="2"
      />
      {/* Data points */}
      {dataPoints.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r="3" fill="#e06c5c" />
      ))}
      {/* Labels */}
      {LABELS.map((item, idx) => {
        const angle = (Math.PI * 2 * idx) / 6 - Math.PI / 2;
        const labelRadius = radius + 18;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);
        return (
          <text
            key={idx}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#64748b"
          >
            {item.label}
          </text>
        );
      })}
    </svg>
  );
}
