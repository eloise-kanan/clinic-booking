// Subtle "Powered by Kanan" attribution shown on public-facing pages
// (currently /book and /login). Uses Kanan navy on the link and stays
// in muted grey otherwise so it doesn't compete with the clinic's own
// brand colors (which are applied via CSS vars elsewhere).

export function PoweredByKanan() {
  return (
    <footer className="mt-10 text-center text-[11px] text-stone-500">
      Powered by{" "}
      <a
        href="https://kanan.my"
        target="_blank"
        rel="noreferrer"
        className="font-medium hover:underline underline-offset-2"
        style={{ color: "#1B2A4A" }}
      >
        Kanan
      </a>{" "}
      · your trusted right hand
    </footer>
  );
}
