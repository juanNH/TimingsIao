const BOSSES = [
  {
    id: "garveloth",
    name: "Garveloth",
    respawnMinMinutes: 30,
    respawnMaxMinutes: 45
  },
  {
    id: "archimago",
    name: "Archimago",
    respawnMinMinutes: 360,
    respawnMaxMinutes: 540
  },
  {
    id: "djin",
    name: "Djin",
    respawnMinMinutes: 240,
    respawnMaxMinutes: 390
  },
  {
    id: "guarda",
    name: "Guarda",
    respawnMinMinutes: 210,
    respawnMaxMinutes: 330
  },
  {
    id: "gorgona",
    name: "Gorgona",
    respawnMinMinutes: 45,
    respawnMaxMinutes: 100
  },
  {
    id: "khern-ghard",
    name: "Khern Ghard",
    respawnMinMinutes: 300,
    respawnMaxMinutes: 480
  }
];

type BossRecord = {
  boss_id: string;
  last_seen_at: string;
  last_notified_window: string | null;
};

Deno.serve(async () => {
  try {
    const result = await notifySpawns();

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return Response.json({ error: message }, { status: 500 });
  }
});

async function notifySpawns() {
  const supabaseUrl = readEnv("SUPABASE_URL");
  const supabaseKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? readEnv("SUPABASE_ANON_KEY");
  const discordWebhookUrl = readEnv("DISCORD_WEBHOOK_URL");
  const timeZone =
    Deno.env.get("SPAWN_NOTIFY_TIMEZONE") ?? "America/Argentina/Buenos_Aires";

  const records = await supabaseRequest<BossRecord[]>(
    supabaseUrl,
    supabaseKey,
    "boss_records?select=boss_id,last_seen_at,last_notified_window"
  );
  const now = new Date();
  let notificationsSent = 0;

  for (const boss of BOSSES) {
    const record = records.find((current) => current.boss_id === boss.id);
    if (!record?.last_seen_at) continue;

    const lastSeenAt = new Date(record.last_seen_at);
    const start = addMinutes(lastSeenAt, boss.respawnMinMinutes);
    const end = addMinutes(lastSeenAt, boss.respawnMaxMinutes);
    const windowKey = `${boss.id}:${start.toISOString()}:${end.toISOString()}`;

    const event =
      now >= start && now <= end
        ? {
            key: `${windowKey}:active`,
            content: [
              `@here ${boss.name} entro en ventana de spawn.`,
              `Aparece: ${formatDateTime(start, timeZone)} a ${formatDateTime(end, timeZone)}.`,
              `Ultimo registro: ${formatDateTime(lastSeenAt, timeZone)}.`
            ].join("\n")
          }
        : now > end
          ? {
              key: `${windowKey}:lost`,
              content: [
                `${boss.name}: spawn perdido.`,
                `La ventana era: ${formatDateTime(start, timeZone)} a ${formatDateTime(end, timeZone)}.`,
                `Ultimo registro: ${formatDateTime(lastSeenAt, timeZone)}.`
              ].join("\n")
            }
          : null;

    if (!event || record.last_notified_window === event.key) continue;

    await sendDiscordMessage(discordWebhookUrl, event.content);
    await supabaseRequest(
      supabaseUrl,
      supabaseKey,
      `boss_records?boss_id=eq.${encodeURIComponent(boss.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ last_notified_window: event.key })
      }
    );

    notificationsSent += 1;
  }

  return {
    ok: true,
    notificationsSent,
    checkedAt: now.toISOString()
  };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatDateTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  }).format(date);
}

async function sendDiscordMessage(webhookUrl: string, content: string) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      allowed_mentions: { parse: ["everyone"] }
    })
  });

  if (!response.ok) {
    throw new Error(`Discord rejected message: ${response.status} ${await response.text()}`);
  }
}

async function supabaseRequest<T>(
  supabaseUrl: string,
  supabaseKey: string,
  path: string,
  init: RequestInit = {}
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase rejected request: ${response.status} ${await response.text()}`);
  }

  if (response.status === 204) return null as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

function readEnv(key: string) {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing ${key}.`);
  return value;
}
