export default function CircularProgress({ percent = 0, size = 180, stroke = 12 }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (p / 100) * circ;

  let color = "#ef4444";
  if (p >= 75) color = "#16a34a";
  else if (p >= 50) color = "#eab308";
  else if (p >= 25) color = "#f59e0b";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset .6s ease, stroke .2s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22, color: "#0f172a" }}>
        {Math.round(p)}%
      </div>
    </div>
  );
}
