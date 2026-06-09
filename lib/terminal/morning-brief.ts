// Typed client for the terminal /api/morning-brief endpoint.
// Single source of truth for the morning report payload.

export interface MorningBrief {
  asOf: string;
  btc: {
    priceUsd: number | null;
  };
  fund: {
    aumUsd: number | null;
    mtdPct: number | null;
    cashUsd: number | null;
  };
  btcMtdPct: number | null;
}

export async function fetchMorningBrief(): Promise<MorningBrief> {
  const terminalApiUrl = process.env.TERMINAL_API_URL;
  const briefApiKey = process.env.BRIEF_API_KEY;

  if (!terminalApiUrl || !briefApiKey) {
    throw new Error('TERMINAL_API_URL and BRIEF_API_KEY must be set');
  }

  const res = await fetch(`${terminalApiUrl}/api/morning-brief`, {
    headers: { Authorization: `Bearer ${briefApiKey}` },
  });

  if (!res.ok) {
    throw new Error(`Morning Brief API ${res.status}: ${await res.text()}`);
  }

  return (await res.json()) as MorningBrief;
}
