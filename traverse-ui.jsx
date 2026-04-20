// Traverse — UI Components (shared)

const { useState, useEffect, useRef } = React;

// ── Topo SVG pattern ──────────────────────────────────────────────────
const TopoPattern = ({ opacity = 0.06, className = "" }) => (
  <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="topo" x="0" y="0" width="320" height="220" patternUnits="userSpaceOnUse">
        <ellipse cx="160" cy="110" rx="150" ry="100" fill="none" stroke="#2D3E2F" strokeWidth="1"/>
        <ellipse cx="160" cy="110" rx="120" ry="75" fill="none" stroke="#2D3E2F" strokeWidth="1"/>
        <ellipse cx="160" cy="110" rx="90" ry="52" fill="none" stroke="#2D3E2F" strokeWidth="1"/>
        <ellipse cx="160" cy="110" rx="60" ry="32" fill="none" stroke="#2D3E2F" strokeWidth="1"/>
        <ellipse cx="160" cy="110" rx="32" ry="16" fill="none" stroke="#2D3E2F" strokeWidth="1"/>
        <ellipse cx="0" cy="0" rx="80" ry="50" fill="none" stroke="#2D3E2F" strokeWidth="1"/>
        <ellipse cx="320" cy="220" rx="80" ry="50" fill="none" stroke="#2D3E2F" strokeWidth="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#topo)" opacity={opacity}/>
  </svg>
);

// ── Avatar ─────────────────────────────────────────────────────────────
const Avatar = ({ initials, size = "sm", confirmed = true }) => {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-mono font-semibold flex-shrink-0`}
      style={{ backgroundColor: confirmed ? "#2D3E2F" : "#E8E2D4", color: confirmed ? "#F4F1EA" : "#7A8471", border: confirmed ? "none" : "1px solid #7A8471" }}>
      {initials}
    </div>
  );
};

// ── Badge ──────────────────────────────────────────────────────────────
const Badge = ({ label, color = "sand" }) => {
  const colors = {
    sand: { bg: "#E8E2D4", text: "#1F1F1E" },
    forest: { bg: "#2D3E2F", text: "#F4F1EA" },
    rust: { bg: "#A64B2A", text: "#F4F1EA" },
    sage: { bg: "#7A8471", text: "#F4F1EA" },
  };
  const c = colors[color] || colors.sand;
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: c.bg, color: c.text }}>
      {label}
    </span>
  );
};

// ── Section label ──────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-3 mb-3">
    <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#7A8471", letterSpacing: "0.12em" }}>{children}</p>
    <div className="flex-1 h-px" style={{ backgroundColor: "#D4CEC3" }}/>
  </div>
);

// ── Card ───────────────────────────────────────────────────────────────
const Card = ({ children, className = "", onClick, style }) => (
  <div
    className={`rounded-2xl p-4 ${onClick ? "cursor-pointer" : ""} ${className}`}
    style={{ backgroundColor: "#E8E2D4", ...style }}
    onClick={onClick}
  >
    {children}
  </div>
);

// ── Toggle ─────────────────────────────────────────────────────────────
const Toggle = ({ on, onToggle, label }) => (
  <button onClick={onToggle} className="flex items-center gap-3 w-full text-left">
    <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0`}
      style={{ backgroundColor: on ? "#2D3E2F" : "#E8E2D4", border: `1px solid ${on ? "#2D3E2F" : "#7A8471"}` }}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
        style={{ backgroundColor: on ? "#F4F1EA" : "#7A8471", left: on ? "calc(100% - 1.375rem)" : "2px" }} />
    </div>
    <span className="text-sm" style={{ color: "#1F1F1E" }}>{label}</span>
  </button>
);

// ── Weather icon ───────────────────────────────────────────────────────
const WeatherIcon = ({ icon }) => {
  if (icon === "sun") return <span className="font-mono text-lg" style={{ color: "#A64B2A" }}>&#9788;</span>;
  if (icon === "cloud") return <span className="font-mono text-lg" style={{ color: "#7A8471" }}>&#9729;</span>;
  return <span className="font-mono text-lg">&#9730;</span>;
};

// Export all
Object.assign(window, { TopoPattern, Avatar, Badge, SectionLabel, Card, Toggle, WeatherIcon });
