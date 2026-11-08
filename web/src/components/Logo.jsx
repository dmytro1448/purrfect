export default function Logo({ size = 22 }) {
  return (
    <div className="logo" style={{ fontSize: size }}>
      <svg width={size * 1.25} height={size * 1.25} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF8AC4" /><stop offset=".55" stopColor="#FF4FA3" /><stop offset="1" stopColor="#9B4DFF" />
          </linearGradient>
        </defs>
        <path d="M12 24 L15 8 L25 17 Q32 15 39 17 L49 8 L52 24 Q57 33 51 42 Q44 53 32 58 Q20 53 13 42 Q7 33 12 24Z" fill="url(#logo-g)" />
        <path d="M24 34 q2.5 -3 5 0 M35 34 q2.5 -3 5 0" stroke="#0B0A0D" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M30 41 q2 2 4 0" stroke="#0B0A0D" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
      <span>Purr<em>fect</em></span>
    </div>
  )
}
