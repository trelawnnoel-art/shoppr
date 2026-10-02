'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Mission, Scout } from '@/data/types';
import { useFetch } from '@/lib/useFetch';
import { DeliveryStatus, STATUS_NARRATIVE, statusProgress } from './DeliveryStatus';
import { ScoutProfile } from './ScoutProfile';
import { ScoutTrackingVisual } from './ScoutTrackingVisual';
import { MissionChat } from './MissionChat';

/**
 * Leads with the human moment ("Arriving today — 2 stops away"), not
 * system state. The full step-by-step pipeline, Scout profile, a mock
 * live-position visual, and a chat thread are all available behind
 * "View tracking details" for anyone who wants them.
 */
export function MissionCard({ mission }: { mission: Mission }) {
  const [showDetails, setShowDetails] = useState(false);
  // Full Scout detail (rating/photo) isn't on the list payload — the
  // mission-detail route has it. Small/cheap enough to just always fetch
  // rather than thread lazy-loading state through this component.
  const detail = useFetch<{ scout: Scout | null }>(`/api/missions/${mission.id}`);
  const isActive = mission.status !== 'created' && mission.status !== 'complete';

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-blue">
          {STATUS_NARRATIVE[mission.status]}
        </p>
        {mission.etaMinutes !== null && (
          <span className="rounded-pill bg-accent-blue-soft px-2.5 py-1 text-[11px] font-semibold text-accent-blue">
            {mission.etaMinutes} min
          </span>
        )}
      </div>

      <h3 className="font-display text-base font-semibold text-ink">{mission.title}</h3>
      <p className="mt-1 text-sm text-ink-soft">
        {mission.scoutName === 'Not yet assigned' ? mission.note : `Scout: ${mission.scoutName}`}
      </p>
      {mission.scoutName !== 'Not yet assigned' && (
        <p className="text-sm text-muted">{mission.note}</p>
      )}

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="mt-3 flex items-center gap-1 text-xs font-semibold text-accent-blue"
        aria-expanded={showDetails}
      >
        View tracking details
        <ChevronDown
          size={14}
          className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}
        />
      </button>

      {showDetails && (
        <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
          {detail.data?.scout && <ScoutProfile scout={detail.data.scout} />}

          {isActive && <ScoutTrackingVisual progress={statusProgress(mission.status)} />}

          <DeliveryStatus status={mission.status} />

          {detail.data?.scout && (
            <div className="border-t border-line pt-4">
              <MissionChat missionId={mission.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
