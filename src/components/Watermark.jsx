export default function Watermark({ src = "/FOE BASICO.png", opacity = 0.08, size = 600 }) {
  return (
    <div data-watermark aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", display: "grid", placeItems: "center" }}>
      <img src={src} alt="marca de agua" style={{ width: size, height: size, opacity, filter: "grayscale(100%)", userSelect: "none" }} draggable="false" />
    </div>
  );
}
