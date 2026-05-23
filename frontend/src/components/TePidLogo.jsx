const LOGO_SRC = "/tepid-logo.png";

// eslint-disable-next-line no-unused-vars
export function TePidIcon({ size = 48, color }) {
  return (
    <img
      src={LOGO_SRC}
      width={size}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
      alt="TePid"
    />
  );
}

/* ─── Horizontal layout (sidebar / navbar) ─── */
export function TePidLogoHorizontal({ iconSize = 36 }) {
  return <TePidIcon size={iconSize} />;
}

/* ─── Stacked layout (login / splash screen) ─── */
export function TePidLogoStacked({ iconSize = 90 }) {
  return <TePidIcon size={iconSize} />;
}
