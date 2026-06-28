"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Job, Quote } from "@/types";
import { Badge, statusVariant } from "@/components/ui/badge";
import { CalendarBlank, CaretLeft, CaretRight, MapPin, Plus } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/format";

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
  const [approvedQuotes, setApprovedQuotes] = useState<Quote[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [schedulingQuoteId, setSchedulingQuoteId] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState("");

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    fetch(`/api/jobs?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(data => setJobs(Array.isArray(data) ? data : []));
  }, [year, month]);

  useEffect(() => {
    fetch("/api/quotes")
      .then(r => r.json())
      .then(data => {
        const rows = Array.isArray(data) ? data : [];
        setApprovedQuotes(rows.filter((quote: Quote) => quote.status === "approved" && !quote.scheduled_start).slice(0, 4));
      });
  }, []);

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
  const selectedDate = selectedDay ? new Date(year, month, selectedDay) : null;
  const isSelectedToday = !!selectedDate
    && selectedDate.getDate() === today.getDate()
    && selectedDate.getMonth() === today.getMonth()
    && selectedDate.getFullYear() === today.getFullYear();

  async function handleScheduleQuote(quote: Quote) {
    if (!selectedDate) return;
    setSchedulingQuoteId(quote.id);
    setScheduleMessage("");
    const scheduledStart = new Date(selectedDate);
    scheduledStart.setHours(9, 0, 0, 0);
    const scheduledEnd = new Date(scheduledStart);
    scheduledEnd.setHours(12, 0, 0, 0);

    const jobResponse = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: quote.client_id,
        quote_id: quote.id,
        title: `${quote.client_name} job`,
        description: quote.notes,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        address: quote.client_address,
      }),
    });

    if (jobResponse.ok) {
      await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
        }),
      });
      const newJob = await jobResponse.json();
      setJobs(current => [...current, newJob]);
      setApprovedQuotes(current => current.filter(item => item.id !== quote.id));
      setScheduleMessage(`${quote.client_name} scheduled for ${formatTime(scheduledStart.toISOString())}.`);
    } else {
      setScheduleMessage("Could not schedule that quote. Try again.");
    }
    setSchedulingQuoteId(null);
  }

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
      <PageHeader title="Calendar" subtitle="Scheduled and in-progress work by day." />

      <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <Surface className="p-3">
        <div className="flex items-center justify-between pb-3">
          <button onClick={prevMonth} className="grid h-10 w-10 place-items-center rounded-lg text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]">
            <CaretLeft size={20} weight="bold" />
            <span className="sr-only">Previous month</span>
          </button>
          <div className="flex items-center gap-2">
            <CalendarBlank size={20} weight="duotone" className="text-[var(--tr-green)]" />
            <h1 className="text-base font-semibold text-[var(--tr-text)]">{monthName} {year}</h1>
          </div>
          <button onClick={nextMonth} className="grid h-10 w-10 place-items-center rounded-lg text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]">
            <CaretRight size={20} weight="bold" />
            <span className="sr-only">Next month</span>
          </button>
        </div>

        <div className="grid grid-cols-7 text-center">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
            <div key={day} className="py-2 text-sm font-medium text-[var(--tr-text-muted)]">{day}</div>
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
                    ? "bg-[var(--tr-primary-fill)] text-[var(--tr-primary)] shadow-[inset_0_0_0_1px_var(--tr-primary-edge)]"
                    : hasJobs
                      ? "border border-[var(--tr-green)]/40 bg-[var(--tr-green)]/10 text-emerald-100 ring-1 ring-[var(--tr-green)]/15"
                    : isToday
                      ? "bg-[var(--tr-green)]/15 text-[var(--tr-green)]"
                      : "text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-2)]"
                }`}
              >
                <span className="leading-none">{day}</span>
                {hasJobs && !isSelected && (
                  <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-md bg-[var(--tr-green)] px-1 text-sm font-semibold leading-none text-[#052112]">
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
            <h2 className="text-sm font-semibold text-[var(--tr-text-muted)]">
              {monthName} {selectedDay}
            </h2>
            <span className="text-sm text-[var(--tr-text-muted)]">
              {selectedJobs.length} {selectedJobs.length === 1 ? "job" : "jobs"}
            </span>
          </div>

          {selectedJobs.length > 0 ? (
            <div className="space-y-3">
              {selectedJobs.map(job => (
                <Surface key={job.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--tr-text)]">{job.title}</p>
                      <p className="mt-1 text-sm text-[var(--tr-text-muted)]">
                        {formatTime(job.scheduled_start)}
                        {job.scheduled_end && ` - ${formatTime(job.scheduled_end)}`}
                      </p>
                      {job.address && (
                        <p className="mt-2 flex items-start gap-1.5 text-sm text-[var(--tr-text-muted)]">
                          <MapPin size={14} weight="duotone" className="mt-0.5 shrink-0 text-[var(--tr-text-faint)]" />
                          <span>{job.address}</span>
                        </p>
                      )}
                      {job.quote_id && (
                        <Link href={`/quotes/${job.quote_id}`} className="mt-3 inline-flex text-sm font-semibold text-[var(--tr-primary)]">
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
              <p className="text-sm font-medium text-[var(--tr-text)]">
                {isSelectedToday ? "No scheduled jobs for today." : "No jobs scheduled for this day."}
              </p>
              {approvedQuotes.length > 0 ? (
                <div className="mt-5 space-y-3 text-left">
                  <p className="text-sm font-semibold text-[var(--tr-text)]">Schedule approved work</p>
                  {approvedQuotes.map(quote => (
                    <div key={quote.id} className="rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--tr-text)]">{quote.client_name}</p>
                          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{quote.client_address ?? "No address saved"}</p>
                        </div>
                        <Button size="sm" variant="secondary" loading={schedulingQuoteId === quote.id} onClick={() => handleScheduleQuote(quote)}>
                          Schedule
                        </Button>
                      </div>
                    </div>
                  ))}
                  {scheduleMessage && <p className="text-sm text-[var(--tr-text-muted)]">{scheduleMessage}</p>}
                </div>
              ) : (
                <Link href="/quotes/new" className="tr-primary-action mt-5 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold">
                  <Plus size={17} weight="bold" />
                  Create quote
                </Link>
              )}
            </Surface>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
