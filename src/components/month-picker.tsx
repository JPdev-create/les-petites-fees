"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DAYS_SHORT, capitalize, formatDate, monthGrid, periodLabel, shiftPeriod, todayISO } from "@/lib/format";

export type DayMarker = { color: string; label?: string; status?: string };

/**
 * Calendrier mensuel tactile à sélection multiple.
 * Grandes cases (≥ 44 px) pensées pour le pouce : un toucher = un jour.
 */
export function MonthPicker({
  period, onPeriod, selected, onToggle, markers = {}, minDate, maxPeriod, minPeriod,
}: {
  period: string;
  onPeriod: (p: string) => void;
  selected: Set<string>;
  onToggle: (date: string) => void;
  markers?: Record<string, DayMarker[]>;
  minDate?: string;
  minPeriod?: string;
  maxPeriod?: string;
}) {
  const today = todayISO();
  const weeks = monthGrid(period);
  const canPrev = !minPeriod || period > minPeriod;
  const canNext = !maxPeriod || period < maxPeriod;

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => onPeriod(shiftPeriod(period, -1))} className="btn-ghost size-10 px-0" aria-label="Mois précédent">
          <ChevronLeft className="size-5" />
        </button>
        <p className="font-display text-lg font-semibold">{capitalize(periodLabel(period))}</p>
        <button type="button" disabled={!canNext} onClick={() => onPeriod(shiftPeriod(period, 1))} className="btn-ghost size-10 px-0" aria-label="Mois suivant">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS_SHORT.map((d, i) => (
          <div key={d} className={`pb-1 text-[11px] font-semibold uppercase tracking-wide ${i >= 5 ? "text-brand-600 dark:text-brand-400" : "text-zinc-400"}`}>
            {d.slice(0, 3)}
          </div>
        ))}
        {weeks.flat().map((date, i) => {
          if (!date) return <div key={`x${i}`} />;
          const disabled = !!minDate && date < minDate;
          const isSel = selected.has(date);
          const isToday = date === today;
          const marks = markers[date] ?? [];
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(date)}
              aria-pressed={isSel}
              aria-label={formatDate(date)}
              className={`relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl text-[15px] font-medium transition
                ${isSel ? "animate-pop bg-brand-600 text-white shadow-md shadow-brand-700/30" : disabled ? "text-zinc-300 dark:text-zinc-600" : "hover:bg-brand-50 active:bg-brand-100 dark:hover:bg-white/5"}
                ${isToday && !isSel ? "ring-2 ring-inset ring-brand-400" : ""}`}
            >
              {Number(date.slice(8))}
              {marks.length > 0 && (
                <span className="absolute bottom-1.5 flex gap-0.5">
                  {marks.slice(0, 3).map((m, j) => (
                    <span key={j} title={m.label} className={`size-1.5 rounded-full ${isSel ? "ring-1 ring-white" : ""}`} style={{ background: m.color }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
