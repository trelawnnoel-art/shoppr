'use client';

import { useEffect, useRef, useState } from 'react';
import { AvaturnSDK, type ExportAvatarResult } from '@avaturn/sdk';
import { AvatarModelScene } from './AvatarModelScene';

// Selfie-based "Realistic" avatar style, via Avaturn (https://docs.avaturn.me).
// Their web SDK embeds the avatar creator as an iframe inside a container
// div we provide, and emits an `export` event with the finished avatar's
// .glb once the user clicks through.
//
// This uses Avaturn's SIMPLE integration mode: a plain subdomain URL
// (`https://{subdomain}.avaturn.dev`), no backend call needed. Their docs
// note a few callbacks (`load`, `assetSet`, `bodySet`) only fire when the
// session is instead created server-side via their REST API
// (`POST /v1/sessions/new`, needs a secret API key) — but `export`, the
// one thing we actually need, works in this simpler mode too. If we later
// need those richer callbacks (e.g. live asset-swap UI), upgrading means
// adding a server route that calls `/v1/sessions/new` and passing ITS
// returned url into `sdk.init()` instead of the plain subdomain url below.
//
// NEXT_PUBLIC_AVATURN_SUBDOMAIN comes from the project you create at
// developer.avaturn.me. Until that's set in .env, this renders the same
// "not connected" placeholder it always has — no behavior change.
const AVATURN_SUBDOMAIN = process.env.NEXT_PUBLIC_AVATURN_SUBDOMAIN;

type Status = 'loading' | 'ready' | 'exported' | 'error';

export function RealisticAvatarScene({
  onExported,
}: {
  onExported?: (result: ExportAvatarResult) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!AVATURN_SUBDOMAIN || !containerRef.current) return;

    let sdk: AvaturnSDK | null = null;
    let cancelled = false;

    (async () => {
      try {
        sdk = new AvaturnSDK();
        await sdk.init(containerRef.current, {
          url: `https://${AVATURN_SUBDOMAIN}.avaturn.dev`,
        });
        if (cancelled) return;

        sdk.on('export', (result) => {
          setExportedUrl(result.url);
          setStatus('exported');
          onExported?.(result);
        });
        sdk.on('error', (err) => {
          setErrorMessage(err.message ?? err.type);
          setStatus('error');
        });

        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load avatar creator');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      sdk?.destroy();
    };
  }, [onExported]);

  if (!AVATURN_SUBDOMAIN) {
    return <RealisticAvatarPlaceholder />;
  }

  if (status === 'error') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface px-6 text-center shadow-card sm:h-72">
        <p className="text-sm font-medium text-ink-soft">Couldn&rsquo;t load the avatar creator</p>
        <p className="max-w-xs text-xs text-muted">{errorMessage}</p>
      </div>
    );
  }

  if (status === 'exported' && exportedUrl) {
    // Hands off to the existing glTF-loading pipeline (AvatarModelScene,
    // built earlier for the Hitem3D models) to actually render the
    // exported avatar — no need to duplicate that plumbing. NOTE: its
    // camera framing was tuned for the Hitem3D files' specific bounding
    // box (~1.0 tall, centered near origin); an Avaturn export's real
    // bbox is untested since this has never run against a live account.
    // If the avatar renders oddly cropped/off-center, that's the first
    // place to look — see the comment in AvatarModelScene.tsx.
    return (
      <div className="flex flex-col gap-2">
        <div className="h-64 overflow-hidden rounded-card border border-line bg-surface shadow-card sm:h-72">
          <AvatarModelScene modelPath={exportedUrl} />
        </div>
        <button
          type="button"
          onClick={() => {
            setStatus('loading');
            setExportedUrl(null);
          }}
          className="mx-auto rounded-pill border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-soft"
        >
          Create a new one
        </button>
      </div>
    );
  }

  return (
    <div className="h-64 overflow-hidden rounded-card border border-line bg-surface shadow-card sm:h-72">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

// Honest placeholder, not a fake/broken embed — shown until
// NEXT_PUBLIC_AVATURN_SUBDOMAIN is set in .env. Sized to match the cartoon
// canvas above so switching styles doesn't jolt the layout.
function RealisticAvatarPlaceholder() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line bg-surface px-6 text-center shadow-card sm:h-72">
      <p className="text-sm font-medium text-ink-soft">Realistic avatars aren&rsquo;t connected yet</p>
      <p className="max-w-xs text-xs text-muted">
        This style will let you scan a selfie to build a realistic 3D avatar, once the
        avatar-creation service (Avaturn) is set up and wired in.
      </p>
    </div>
  );
}
