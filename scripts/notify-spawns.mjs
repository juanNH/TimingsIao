import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseTable = process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? "boss_records";
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const timeZone = process.env.SPAWN_NOTIFY_TIMEZONE ?? "America/Argentina/Buenos_Aires";

const bosses = JSON.parse(
  readFileSync(join(rootDir, "src", "lib", "boss-data.json"), "utf8")
);

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

if (!dryRun && !discordWebhookUrl) {
  throw new Error("Missing DISCORD_WEBHOOK_URL.");
}

const records = await supabaseRequest(
  `${supabaseTable}?select=boss_id,last_seen_at,last_notified_window`
);
const now = new Date();
let notificationsSent = 0;

for (const boss of bosses) {
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
            `Aparece: ${formatDateTime(start)} a ${formatDateTime(end)}.`,
            `Ultimo registro: ${formatDateTime(lastSeenAt)}.`
          ].join("\n")
        }
      : now > end
        ? {
            key: `${windowKey}:lost`,
            content: [
              `${boss.name}: spawn perdido.`,
              `La ventana era: ${formatDateTime(start)} a ${formatDateTime(end)}.`,
              `Ultimo registro: ${formatDateTime(lastSeenAt)}.`
            ].join("\n")
          }
        : null;

  if (!event || record.last_notified_window === event.key) continue;

  if (dryRun) {
    console.log(`[dry-run] ${event.content}`);
  } else {
    await sendDiscordMessage(event.content);
    await supabaseRequest(`${supabaseTable}?boss_id=eq.${encodeURIComponent(boss.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ last_notified_window: event.key })
    });
  }

  notificationsSent += 1;
}

console.log(
  notificationsSent === 0
    ? "No active spawn windows to notify."
    : `Notifications sent: ${notificationsSent}.`
);

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  }).format(date);
}

async function sendDiscordMessage(content) {
  const response = await fetch(discordWebhookUrl, {
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

async function supabaseRequest(path, init = {}) {
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

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function loadLocalEnv() {
  const envPath = join(rootDir, ".env.local");

  try {
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trimStart().startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      process.env[key] ??= value;
    }
  } catch {
    // The workflow provides environment variables directly.
  }
}
