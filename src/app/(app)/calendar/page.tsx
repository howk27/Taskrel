"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Job } from "@/types";
import { Badge, statusVariant } from "@/components/ui/badge";
import { CalendarBlank, CaretLeft, CaretRight, MapPin } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatTime } from "@/lib/format";
import { emptyStateFor } from "@/lib/readiness/setup-readiness";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    fetch(`/api/jobs?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(data => setJobs(Array.isArray(data) ? data : []));
  }, [year, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Date(year, month).toLocaleString("default", { month: "long" });

  const jobsByDay: Record<number, Job[]> = {};
  jobs
    .filter(job => ["scheduled", "in_progress"].includes(job.status))
    .forEach(job => {
      const day = new Date(job.scheduled_start).getDate();
      if (!jobsByDay[day]) jobsByDay[day] = [];
      jobsByDay[day].push(job);
    });

  const selectedJobs = selectedDay ? (jobsByDay[selectedDay] ?? []) : [];
  const empty = emptyStateFor("calendar_day");

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader eyebrow="Schedule" title="Calendar" subtitle="Scheduled and in-progress work by day." />

      <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <Surface className="p-3">
        <div className="flex items-center justify-between pb-3">
          <button onClick={prevMonth} className="grid h-10 w-10 place-items-center rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white">
            <CaretLeft size={20} weight="bold" />
            <span className="sr-only">Previous month</span>
          </button>
          <div className="flex items-center gap-2">
            <CalendarBlank size={20} weight="duotone" className="text-[var(--tr-green)]" />
            <h1 className="text-base font-semibold text-white">{monthName} {year}</h1>
          </div>
          <button onClick={nextMonth} className="grid h-10 w-10 place-items-center rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white">
            <CaretRight size={20} weight="bold" />
            <span className="sr-only">Next month</span>
          </button>
        </div>

        <div className="grid grid-cols-7 text-center">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
            <div key={day} className="py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const jobCount = jobsByDay[day]?.length ?? 0;
            const hasJobs = jobCount > 0;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = day === selectedDay;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative grid aspect-square place-items-center overflow-hidden rounded-lg text-sm font-semibold transition-colors ${
                  isSelected
                    ? "bg-[var(--tr-green)] text-[#052112] shadow-sm shadow-emerald-950/40"
                    : hasJobs
                      ? "border border-[var(--tr-green)]/40 bg-[var(--tr-green)]/10 text-emerald-100 ring-1 ring-[var(--tr-green)]/15"
                    : isToday
                      ? "bg-[var(--tr-green)]/15 text-[var(--tr-green)]"
                      : "text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                <span className="leading-none">{day}</span>
                {hasJobs && !isSelected && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--tr-green)] px-1 text-[9px] font-black leading-none text-[#052112] shadow-sm shadow-emerald-950/30">
                    {jobCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </Surface>

        {selectedDay && (
        <section className="xl:pt-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {monthName} {selectedDay}
            </h2>
            <span className="text-xs text-slate-500">
              {selectedJobs.length} {selectedJobs.length === 1 ? "job" : "jobs"}
            </span>
          </div>

          {selectedJobs.length > 0 ? (
            <div className="space-y-3">
              {selectedJobs.map(job => (
                <Surface key={job.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{job.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatTime(job.scheduled_start)}
                        {job.scheduled_end && ` - ${formatTime(job.scheduled_end)}`}
                      </p>
                      {job.address && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                          <MapPin size={14} weight="duotone" className="mt-0.5 shrink-0 text-slate-500" />
                          <span>{job.address}</span>
                        </p>
                      )}
                      {job.quote_id && (
                        <Link href={`/quotes/${job.quote_id}`} className="mt-3 inline-flex text-sm font-semibold text-[var(--tr-blue)]">
                          Open quote
                        </Link>
                      )}
                    </div>
                    <Badge variant={statusVariant(job.status)}>{job.status.replace("_", " ")}</Badge>
                  </div>
                </Surface>
              ))}
            </div>
          ) : (
            <Surface className="p-8 text-center">
              <CalendarBlank size={30} weight="duotone" className="mx-auto mb-3 text-slate-500" />
              <p className="text-sm font-medium text-white">{empty.title}</p>
              <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{empty.body}</p>
            </Surface>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
