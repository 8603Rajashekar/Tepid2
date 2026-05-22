// TePid brand logo — SVG recreation of the circuit-board T mark

export function TePidIcon({ size = 48, color = "#1B2D6B" }) {
  // viewBox 100×100
  // Circle: center (50,50), radius 42, gap at bottom-right (~58° to ~135°)
  // Circuit T inside: horizontal bar, left bracket, top stub → top node,
  //   center stem → bottom node, right arm → large circle-end node
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Partial circle: from bottom-right (73,87) counterclockwise to bottom-left (20,80) ── */}
      <path
        d="M 73,87 A 42,42 0 1,0 20,80"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* ── Horizontal bar of T ── */}
      <line x1="25" y1="38" x2="73" y2="38" stroke={color} strokeWidth="5" strokeLinecap="round" />

      {/* ── Top stub: junction on horizontal → up to top node ── */}
      <line x1="61" y1="38" x2="61" y2="16" stroke={color} strokeWidth="5" strokeLinecap="round" />

      {/* ── Left bracket: left end of horizontal → down → right to center stem ── */}
      <path
        d="M 25,38 L 25,58 L 50,58"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Center vertical stem: down from horizontal to bottom node ── */}
      <line x1="50" y1="38" x2="50" y2="74" stroke={color} strokeWidth="5" strokeLinecap="round" />

      {/* ── Right arm: right end of horizontal → down to circle end ── */}
      <line x1="73" y1="38" x2="73" y2="87" stroke={color} strokeWidth="5" strokeLinecap="round" />

      {/* ── Nodes ── */}
      <circle cx="61" cy="16"  r="5"   fill={color} />  {/* top node        */}
      <circle cx="61" cy="38"  r="4.5" fill={color} />  {/* junction node   */}
      <circle cx="50" cy="74"  r="5"   fill={color} />  {/* bottom stem node*/}
      <circle cx="73" cy="87"  r="5.5" fill={color} />  {/* circle-end node */}
    </svg>
  );
}

// Full logo — icon + wordmark, horizontal layout
export function TePidLogoHorizontal({ iconSize = 36, color = "#1B2D6B" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <TePidIcon size={iconSize} color={color} />
      <span style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontWeight: 700,
        fontSize: iconSize * 0.67,
        color,
        letterSpacing: 0.5,
        lineHeight: 1,
      }}>
        TePid
      </span>
    </div>
  );
}

// Full logo — icon + wordmark, stacked (for login / splash)
export function TePidLogoStacked({ iconSize = 80, color = "#1B2D6B" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <TePidIcon size={iconSize} color={color} />
      <span style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontWeight: 700,
        fontSize: iconSize * 0.38,
        color,
        letterSpacing: 1.5,
      }}>
        TePid
      </span>
    </div>
  );
}
