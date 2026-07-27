import { Check } from 'lucide-react';
import type { MissionStatus } from '@/data/types';

/** Short, human status shown on the Mission card itself — not system language. */
export const STATUS_NARRATIVE: Record<MissionStatus, string> = {
  created: 'Order received',
  scout_accepted: 'Scout on it',
  shopping: 'Being prepared',
  purchase_confirmed: 'Purchase confirmed',
  on_the_way: 'Arriving today',
  complete: 'Delivered',
};

const STATUS_SEQUENCE: { key: MissionStatus; label: string }[] = [
  { key: 'created', label: 'Mission created' },
  { key: 'scout_accepted', label: 'Scout accepted' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'purchase_confirmed', label: 'Purchase confirmed' },
  { key: 'on_the_way', label: 'On the way' },
  { key: 'complete', label: 'Mission complete' },
];

export function DeliveryStatus({ status }: { status: MissionStatus }) {
  const currentIndex = STATUS_SEQUENCE.findIndex((s) => s.key === status);

  return (
    <ol className="flex flex-col gap-3">
      {STATUS_SEQUENCE.map((step, i) => {
        const isComplete = i < currentIndex || status === 'complete';
        const isCurrent = i === currentIndex && status !== 'complete';

        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                isComplete
                  ? 'bg-accent-emerald text-white'
                  : isCurrent
                    ? 'bg-accent-blue text-white'
                    : 'bg-line text-muted'
              }`}
            >
              {isComplete ? <Check size={12} /> : i + 1}
            </span>
            <span
              className={`text-sm ${
                isCurrent ? 'font-semibold text-ink' : isComplete ? 'text-ink-soft' : 'text-muted'
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
