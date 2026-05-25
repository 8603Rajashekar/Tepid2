const LOGO_DARK = "/tepid-logo-white.png";   // white version — for dark/coloured backgrounds
const LOGO_LIGHT = "/tepid-logo.png";         // coloured version — for white/light backgrounds

/**
 * TePidIcon
 * Pass color="white" (or any truthy dark-bg hint) to get the white variant.
 * Default: coloured variant for light backgrounds.
 */
export function TePidIcon({ size = 48, color }) {
  const src = color === "white" ? LOGO_DARK : LOGO_LIGHT;
  return (
    <img
      src={src}
      width={size}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
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
