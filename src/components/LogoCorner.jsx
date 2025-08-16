export default function LogoCorner({ src = "/FOE BASICO.png", size = 40, title = "Logo plataforma", onClick }) {
  return (
    <div data-logo-corner="1" style={{ position: "fixed", top: 12, left: 12, width: size, height: size, zIndex: 2147483646, pointerEvents: "auto" }}>
      {onClick ? (
        <button type="button" onClick={onClick} title={title} style={{
          width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 0, margin: 0,
          border: "1px solid #e2e8f0", borderRadius: 10, background: "transparent", boxShadow: "0 2px 6px rgba(0,0,0,.08)", cursor: "pointer",
        }}>
          <img alt={title} src={src} width={size} height={size} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, background: "white", pointerEvents: "none" }} draggable="false" />
        </button>
      ) : (
        <div title={title} style={{ width: "100%", height: "100%", display: "grid", placeItems: "center",
          border: "1px solid #e2e8f0", borderRadius: 10, background: "transparent", boxShadow: "0 2px 6px rgba(0,0,0,.08)", overflow: "hidden", pointerEvents: "none" }}>
          <img alt={title} src={src} width={size} height={size} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, background: "white", pointerEvents: "none" }} draggable="false" />
        </div>
      )}
    </div>
  );
}
