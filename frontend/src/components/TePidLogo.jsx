const LOGO = "/tepid-logo.png"; // 442×564 — circle icon fills top 442×442, text is bottom 122px

/**
 * TePidIcon
 * Clips the PNG so only the circular icon is visible (hides the "TePid" text
 * that is baked into the bottom of the image).
 * Pass color="white" on dark/coloured backgrounds to invert the logo to white.
 */
export function TePidIcon({ size = 48, color }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <img
        src={LOGO}
        width={size}
        style={{
          display: "block",
          height: "auto",           // natural height > size → bottom text gets clipped
          ...(color === "white"
            ? { filter: "brightness(0) invert(1)" }
            : {}),
        }}
        alt="TePid"
      />
    </div>
  );
}

/* ─── Horizontal layout (sidebar / navbar) ─── */
export function TePidLogoHorizontal({ iconSize = 36, color }) {
  return <TePidIcon size={iconSize} color={color} />;
}

/* ─── Stacked layout (login / splash screen) ─── */
export function TePidLogoStacked({ iconSize = 90, color }) {
  return <TePidIcon size={iconSize} color={color} />;
}
