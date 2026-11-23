import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { Button } from '@/components/ui/button';

const CHUNK_RELOAD_KEY = 'uvd_chunk_reload_at';

function isChunkLoadError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message ?? '')
          : '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  );
}

export function tryReloadOnceOnChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0');
    const now = Date.now();
    if (!Number.isFinite(last) || now - last > 15_000) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    window.location.reload();
    return true;
  }
  return false;
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError) {
      tryReloadOnceOnChunkError();
    }
  }, [chunkError]);

  if (chunkError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <h2 className="text-base font-bold text-foreground">
          Tizim yangi versiyaga yangilanmoqda...
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Yangi yangilanish yuklanmoqda. Agar sahifa avtomatik yangilanmasa, quyidagi tugmani
          bosing.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => window.location.reload()}
          className="gap-2 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sahifani yangilash
        </Button>
      </div>
    );
  }

  const errorMessage = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Kutilmagan xatolik yuz berdi';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-1 max-w-md">
        <h2 className="text-lg font-bold text-foreground">Sahifani yuklashda xatolik</h2>
        <p className="text-xs text-muted-foreground break-words">{errorMessage}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => window.location.reload()}
          className="gap-1.5 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Qayta yuklash
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.href = '/';
          }}
          className="gap-1.5 cursor-pointer"
        >
          <Home className="h-3.5 w-3.5" />
          Bosh sahifa
        </Button>
      </div>
    </div>
  );
}
