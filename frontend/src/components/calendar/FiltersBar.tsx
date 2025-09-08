"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type View = "month" | "week" | "day" | "agenda";
type Status = "All" | "Upcoming" | "In Progress" | "Completed" | "Overdue";

type Props = {
  onChange: (filters: {
    status_filter: Status;
    types: string[];
    priority: string[];
    departments: number[];
    mine: boolean;
    view: View;
  }) => void;
};

const EVENT_TYPES = [
  "Audit",
  "Risk Assessment",
  "Training Session",
  "Compliance Review",
  "Document Review",
  "Incident Investigation",
  "Meeting",
  "Deadline",
  "Other",
] as const;

const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

// Type guards to narrow string -> our unions (no `any`)
const isView = (v: string): v is View => ["month", "week", "day", "agenda"].includes(v);
const isStatus = (v: string): v is Status =>
  ["All", "Upcoming", "In Progress", "Completed", "Overdue"].includes(v);

export default function FiltersBar({ onChange }: Props) {
  const [status, setStatus] = useState<Status>("All");
  const [types, setTypes] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);
  const [departments, setDepartments] = useState<number[]>([]);
  const [mine, setMine] = useState(false);
  const [view, setView] = useState<View>("month");

  const emit = () => onChange({ status_filter: status, types, priority, departments, mine, view });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs
        value={view}
        onValueChange={(v) => {
          if (isView(v)) {
            setView(v);
            emit();
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>
      </Tabs>

      <Separator className="mx-2" />

      <Select
        value={status}
        onValueChange={(v) => {
          if (isStatus(v)) {
            setStatus(v);
            emit();
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {(["All", "Upcoming", "In Progress", "Completed", "Overdue"] as const).map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        onValueChange={(v) => {
          // toggle multi-select emulation
          setTypes((prev) => {
            const next = prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v];
            // emit with the new value immediately to keep UX snappy
            onChange({ status_filter: status, types: next, priority, departments, mine, view });
            return next;
          });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Event Types" />
        </SelectTrigger>
        <SelectContent>
          {EVENT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        onValueChange={(v) => {
          setPriority((prev) => {
            const next = prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v];
            onChange({ status_filter: status, types, priority: next, departments, mine, view });
            return next;
          });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* dept picker placeholder: integrate your real list */}
      <Select
        onValueChange={(v) => {
          const id = Number(v);
          setDepartments((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            onChange({ status_filter: status, types, priority, departments: next, mine, view });
            return next;
          });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Departments" />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4].map((d) => (
            <SelectItem key={d} value={String(d)}>
              Dept {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tooltip>
        <TooltipTrigger asChild>
          <label className="flex items-center gap-2 ml-2 text-sm">
            <span>My Events</span>
            <Switch
              checked={mine}
              onCheckedChange={(v: boolean) => {
                setMine(v);
                emit();
              }}
            />
          </label>
        </TooltipTrigger>
        <TooltipContent side="bottom">Show only events you organized. (Spec 7.7.1)</TooltipContent>
      </Tooltip>

      <Button className="ml-auto" onClick={emit}>
        Apply
      </Button>
    </div>
  );
}
