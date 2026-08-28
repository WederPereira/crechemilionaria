import { createFileRoute } from "@tanstack/react-router";
import html from "../creche-milionaria.html?raw";

// Landing page estática "Creche Milionária" servida diretamente em /.
// O documento HTML já traz <head> completo (SEO, OG, JSON-LD, pixels).
export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async () =>
        new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=0, must-revalidate",
          },
        }),
    },
  },
});
