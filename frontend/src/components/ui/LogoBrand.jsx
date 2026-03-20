/**
 * Logo ZebraPoint z `public/`.
 * Domyślnie pokazuje normalną wersję, a po hover — całość „na zielono”
 * (realizowane przez nakładkę z CSS filter).
 *
 * Wymaga na rodzicu (Link) klasy "group".
 */
export default function LogoBrand({
  className = "h-8 w-auto",
  inverted = false,
}) {
  const src = inverted ? "/logo_circle_text_wh.svg" : "/logo_circle_text.svg";

  return (
    <span className={`relative inline-block ${className}`}>
      <img src={src} alt="ZebraPoint" className={className} />
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={`absolute left-0 top-0 h-full w-auto opacity-0 transition-opacity duration-200 group-hover:opacity-100 zp-logo-green-filter ${className}`}
      />
    </span>
  );
}
