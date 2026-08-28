import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Endpoint público que recebe os leads do site e grava na planilha
// "Leads — Creche Milionária" via conector Google Sheets.
const SPREADSHEET_ID = "143QNz0B67dA3Vwo-v2ipeqMEgLyQ4dzc02JNRmvBRWY";
const SHEET_RANGE = "Leads!A1:T1";
const GATEWAY_URL = `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}:append?valueInputOption=USER_ENTERED`;

const leadSchema = z.object({
  nome: z.string().max(200).optional().default(""),
  creche: z.string().max(200).optional().default(""),
  instagram: z.string().max(200).optional().default(""),
  whatsapp: z.string().max(40).optional().default(""),
  email: z.string().max(200).optional().default(""),
  idioma: z.string().max(10).optional().default(""),
  etapa: z.string().max(60).optional().default(""),
  faturamentoAtual: z.coerce.number().max(1e12).optional().default(0),
  potencial1Ano: z.coerce.number().max(1e12).optional().default(0),
  potencial3Anos: z.coerce.number().max(1e12).optional().default(0),
  ganhoAcumulado3Anos: z.coerce.number().max(1e12).optional().default(0),
  funcionarios: z.coerce.number().max(100000).optional().default(0),
  planosAnuais: z.string().max(60).optional().default(""),
  servicos: z.string().max(2000).optional().default(""),
  temAntipulgas: z.coerce.boolean().optional().default(false),
  temHotel: z.coerce.boolean().optional().default(false),
  ocupacaoHotel: z.coerce.number().max(100).optional().default(0),
  origem: z.string().max(120).optional().default(""),
  pagina: z.string().max(500).optional().default(""),
  enviadoEm: z.string().max(60).optional().default(""),
});

export const Route = createFileRoute("/api/public/lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "JSON inválido" }, { status: 400 });
        }

        const parsed = leadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ ok: false, error: "Dados inválidos" }, { status: 400 });
        }
        const d = parsed.data;

        // Honeypot simples: exige ao menos um contato para gravar.
        if (!d.whatsapp && !d.email) {
          return Response.json({ ok: true, ignorado: true });
        }

        const lovableKey = process.env["LOVABLE_API_KEY"];
        const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
        if (!lovableKey || !sheetsKey) {
          console.error("Segredos do conector Google Sheets ausentes");
          return Response.json({ ok: false, error: "Integração não configurada" }, { status: 500 });
        }

        const row = [
          d.enviadoEm || new Date().toISOString(),
          d.etapa,
          d.nome,
          d.creche,
          d.instagram,
          d.whatsapp,
          d.email,
          d.idioma,
          d.faturamentoAtual,
          d.potencial1Ano,
          d.potencial3Anos,
          d.ganhoAcumulado3Anos,
          d.funcionarios,
          d.planosAnuais,
          d.servicos,
          d.temAntipulgas ? "Sim" : "Não",
          d.temHotel ? "Sim" : "Não",
          d.ocupacaoHotel,
          d.origem,
          d.pagina,
        ];

        const response = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": sheetsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [row] }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Falha ao gravar na planilha [${response.status}]: ${errorBody}`);
          return Response.json(
            { ok: false, error: `Falha ao salvar na planilha [${response.status}]` },
            { status: 502 },
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
