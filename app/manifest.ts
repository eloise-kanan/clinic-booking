import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_CLINIC_NAME || "Clinic Console";
  return {
    name,
    short_name: "Clinic",
    description: "Clinic appointment console",
    start_url: "/login",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    icons: [],
  };
}
