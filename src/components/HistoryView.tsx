"use client";

import { BOSSES } from "@/lib/bosses";
import { formatDisplayDate, formatDisplayTime } from "@/lib/time";
import { useHistory } from "@/hooks/useHistory";

const bossNames = Object.fromEntries(BOSSES.map((boss) => [boss.id, boss.name]));

function formatHistoryDate(value: string | null) {
  if (!value) return "Sin registro previo";

  const date = new Date(value);
  return `${formatDisplayTime(date)} - ${formatDisplayDate(date)}`;
}

export function HistoryView() {
  const {
    error,
    items,
    loading,
    page,
    total,
    totalPages,
    refresh,
    setPage
  } = useHistory();

  return (
    <section className="history-section" aria-label="Historial de cambios">
      <div className="section-header">
        <div>
          <p className="eyebrow">Auditoria</p>
          <h2 className="section-title">Historial de timings</h2>
        </div>
        <button className="secondary-button" type="button" onClick={refresh}>
          Actualizar
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Boss</th>
              <th>Anterior</th>
              <th>Nuevo</th>
              <th>Fecha cambio</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const changedAt = new Date(item.changedAt);

              return (
                <tr key={item.id}>
                  <td>{bossNames[item.bossId] ?? item.bossId}</td>
                  <td>{formatHistoryDate(item.previousLastSeenAt)}</td>
                  <td>{formatHistoryDate(item.newLastSeenAt)}</td>
                  <td>
                    {formatDisplayTime(changedAt)} -{" "}
                    {formatDisplayDate(changedAt)}
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={4}>Todavia no hay cambios registrados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <footer className="pagination">
        <span>
          {loading
            ? "Cargando..."
            : `Pagina ${page} de ${totalPages} (${total} cambios)`}
        </span>
        <div className="pagination-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </div>
      </footer>
    </section>
  );
}
