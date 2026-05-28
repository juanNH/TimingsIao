"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadHistory,
  type BossRecordHistoryItem
} from "@/lib/storage";

const defaultPageSize = 10;

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo cargar el historial.";
}

export function useHistory(pageSize = defaultPageSize) {
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BossRecordHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  }, []);

  useEffect(() => {
    let active = true;

    loadHistory({ page, pageSize })
      .then((result) => {
        if (!active) return;
        setError(null);
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((historyError) => {
        if (!active) return;
        setError(errorMessage(historyError));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, pageSize, refreshKey]);

  return {
    error,
    items,
    loading,
    page,
    pageSize,
    total,
    totalPages,
    refresh,
    setPage: goToPage
  };
}
