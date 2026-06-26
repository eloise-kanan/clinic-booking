// Subtle "Powered by Kanan" attribution shown on public-facing pages
// (currently /book and /login). Two variants:
//   default  — muted grey on light backgrounds (booking page).
//   light    — soft white on dark backgrounds (login, lockscreen).
//              Link uses Kanan gold (#C9A227) for contrast — never gold on
//              warm-white per the brand guide, but gold-on-navy is fine.

export function PoweredByKanan({ variant = "default" }: { variant?: "default" | "light" }) {
  const isLight = variant === "light";
  return (
    <footer
      className={`mt-10 text-center text-[11px] ${
        isLight ? "text-white/65" : "text-stone-500"
      }`}
    >
      Powered by{" "}
      <a
        href="https://kanan.my"
        target="_blank"
        rel="noreferrer"
        className="font-medium hover:underline underline-offset-2"
        style={{ color: isLight ? "#C9A227" : "#1B2A4A" }}
      >
        Kanan
      </a>{" "}
      · your trusted right hand
    </footer>
  );
}
