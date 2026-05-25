const LOGO = "/tepid-logo.png"; // single source — CSS filter makes it white when needed

/**
 * TePidIcon
 * Pass color="white" on dark/coloured backgrounds — applies brightness+invert filter
 * so the coloured logo renders as pure white.
 * Default: coloured variant for light backgrounds (no filter).
 */
export function TePidIcon({ size = 48, color }) {
  const style = {
    objectFit: "contain",
    display: "block",
    ...(color === "white"
      ? { filter: "brightness(0) invert(1)" }   // force pure white
      : {}),
  };
  return (
    <img
      src={LOGO}
      width={size}
      height={size}
      style={style}
      alt="TePid"
    />
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
