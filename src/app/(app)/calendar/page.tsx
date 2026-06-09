"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/types";
import { Badge, statusVariant } from "@/components/ui/badge";

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
  jobs.forEach(job => {
    const d = new Date(job.scheduled_start).getDate();
    if (!jobsByDay[d]) jobsByDay[d] = [];
    jobsByDay[d].push(job);
  });

  const selectedJobs = selectedDay ? (jobsByDay[selectedDay] ?? []) : [];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-white">{monthName} {year}</h1>
        <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-xs font-medium text-slate-500 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const hasJobs = !!jobsByDay[day];
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSelected = day === selectedDay;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-colors relative
                ${isSelected ? "bg-[#F97316] text-white" : isToday ? "bg-[#F97316]/20 text-[#F97316]" : "text-slate-300 hover:bg-slate-700/50"}`}
            >
              {day}
              {hasJobs && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#F97316]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day jobs */}
      {selectedDay && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            {monthName} {selectedDay}
          </h2>
          {selectedJobs.length > 0 ? (
            <div className="rounded-xl bg-[#1E293B] divide-y divide-slate-700/50">
              {selectedJobs.map(job => (
                <div key={job.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{job.title}</p>
                    <p className="text-slate-500 text-xs">
                      {new Date(job.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {job.scheduled_end && ` – ${new Date(job.scheduled_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                    {job.address && <p className="text-slate-500 text-xs">{job.address}</p>}
                  </div>
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">No jobs scheduled.</p>
          )}
        </div>
      )}
    </div>
  );
}
