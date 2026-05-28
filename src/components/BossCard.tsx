import Image from "next/image";
import { type Boss } from "@/lib/bosses";
import { type BossRecord } from "@/lib/storage";
import { formatDisplayDate, formatDisplayTime } from "@/lib/time";
import {
  calculateWindow,
  makeDraft,
  statusLabel,
  type Draft
} from "@/lib/timings";

type BossCardProps = {
  boss: Boss;
  canUndo: boolean;
  draft?: Draft;
  isSaving: boolean;
  isWriteDisabled: boolean;
  now: Date;
  record?: BossRecord;
  onDraftChange: (bossId: string, draft: Draft) => void;
  onRegister: (boss: Boss, useCurrentDate: boolean) => void;
  onUndo: (boss: Boss) => void;
};

export function BossCard({
  boss,
  canUndo,
  draft,
  isSaving,
  isWriteDisabled,
  now,
  record,
  onDraftChange,
  onRegister,
  onUndo
}: BossCardProps) {
  const lastSeenAt = record ? new Date(record.lastSeenAt) : null;
  const windowState = lastSeenAt ? calculateWindow(boss, lastSeenAt, now) : null;
  const currentDraft = draft ?? makeDraft(now);

  return (
    <article className={`boss-card ${windowState?.status ?? ""}`}>
      <div className="boss-media" aria-hidden="true">
        <Image
          className="boss-image"
          src={boss.image}
          alt=""
          sizes="96px"
          priority={boss.id === "garveloth" || boss.id === "archimago"}
        />
      </div>

      <div>
        <h2 className="boss-name">{boss.name}</h2>
        <p className="respawn">{boss.respawnLabel}</p>
      </div>

      <label>
        <span className="field-label">Ultima hora</span>
        <div className="time-row">
          <input
            className="time-input"
            type="time"
            value={currentDraft.time}
            onChange={(event) =>
              onDraftChange(boss.id, {
                ...currentDraft,
                time: event.target.value
              })
            }
          />
          <input
            className="date-input"
            type="date"
            value={currentDraft.date}
            onChange={(event) =>
              onDraftChange(boss.id, {
                ...currentDraft,
                date: event.target.value
              })
            }
          />
        </div>
      </label>

      <p className="last-record">
        {lastSeenAt
          ? `Ultimo registro: ${formatDisplayTime(lastSeenAt)} - ${formatDisplayDate(lastSeenAt)}`
          : "Sin registros todavia"}
      </p>

      <div className="actions-row">
        <button
          className="register-button"
          type="button"
          disabled={isSaving || isWriteDisabled}
          onClick={() => onRegister(boss, false)}
        >
          {isSaving ? "Guardando..." : "Registrar"}
        </button>

        <button
          className="register-button"
          type="button"
          disabled={isSaving || isWriteDisabled}
          onClick={() => onRegister(boss, true)}
        >
          Ahora
        </button>
      </div>

      <button
        className="undo-button"
        type="button"
        disabled={isSaving || isWriteDisabled || !canUndo}
        onClick={() => onUndo(boss)}
      >
        Deshacer ultimo cambio
      </button>

      <div className="card-footer">
        <span className={`status-pill ${windowState?.status ?? "upcoming"}`}>
          {windowState ? statusLabel(windowState.status) : "Sin datos"}
        </span>
      </div>

      <div>
        <span className="field-label">Aparece</span>
        <div className="window">
          {windowState
            ? `${formatDisplayTime(windowState.start)} a ${formatDisplayTime(windowState.end)}`
            : "--:-- a --:--"}
        </div>
      </div>
    </article>
  );
}
