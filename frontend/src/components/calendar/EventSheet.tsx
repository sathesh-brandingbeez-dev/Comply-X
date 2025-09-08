"use client";

import * as React from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

// ---------- types kept minimal for upsert ----------
type EventType =
  | "Audit"
  | "Risk Assessment"
  | "Training Session"
  | "Compliance Review"
  | "Document Review"
  | "Incident Investigation"
  | "Meeting"
  | "Deadline"
  | "Other";

type Priority = "Low" | "Medium" | "High" | "Critical";
type EventStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled";

export type EventUpsertInput = {
  id?: string;
  title: string;
  type: EventType;
  description?: string;
  location?: string;
  department_ids: number[];
  priority: Priority;
  status: EventStatus;
  all_day: boolean;
  start_at: string; // ISO
  end_at: string;   // ISO
  time_zone?: string;
  attendees_required?: string[];
  attendees_optional?: string[];
  reminders: number[]; // minutes-before
};

type EventFormValues = {
  title: string;
  type: EventType;
  description?: string;
  location?: string;
  department_ids: number[];
  priority: Priority;
  status: EventStatus;
  all_day: boolean;
  start_date: string;
  start_time?: string;
  end_date: string;
  end_time?: string;
  time_zone?: string;
  attendees_required_csv?: string;
  attendees_optional_csv?: string;
  reminders: number[];
  recurring: boolean;
};

type InitialEvent = Partial<
  EventUpsertInput & {
    id?: string | number;
  }
>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: InitialEvent | null;
  onSaved: () => void;
  upsertEvent?: (payload: EventUpsertInput) => Promise<unknown>;
};

function toDateOnly(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function toTimeOnly(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function joinDateTime(
  dateStr: string,
  timeStr: string | undefined,
  _tz?: string,
  allDay?: boolean
): string {
  const base = allDay ? `${dateStr}T00:00:00` : `${dateStr}T${timeStr ?? "00:00"}:00`;
  return new Date(base).toISOString();
}

const REMINDER_OPTIONS_MIN = [15, 30, 60, 24 * 60, 7 * 24 * 60] as const;

export default function EventSheet({
  open,
  onOpenChange,
  initial,
  onSaved,
  upsertEvent,
}: Props) {
  const defaultValues: EventFormValues = React.useMemo(() => {
    if (initial) {
      const isAllDay = Boolean(initial.all_day);
      const startISO = initial.start_at ?? new Date().toISOString();
      const endISO = initial.end_at ?? new Date().toISOString();

      return {
        title: initial.title ?? "",
        type: (initial.type as EventType) ?? "Meeting",
        description: initial.description ?? "",
        location: initial.location ?? "",
        department_ids: initial.department_ids ?? [],
        priority: (initial.priority as Priority) ?? "Medium",
        status: (initial.status as EventStatus) ?? "Scheduled",
        all_day: isAllDay,
        start_date: toDateOnly(startISO),
        start_time: isAllDay ? undefined : toTimeOnly(startISO),
        end_date: toDateOnly(endISO),
        end_time: isAllDay ? undefined : toTimeOnly(endISO),
        time_zone: initial.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        attendees_required_csv: (initial.attendees_required ?? []).join(", "),
        attendees_optional_csv: (initial.attendees_optional ?? []).join(", "),
        reminders: initial.reminders ?? [],
        recurring: false,
      };
    }
    const today = toDateOnly(new Date().toISOString());
    return {
      title: "",
      type: "Meeting",
      description: "",
      location: "",
      department_ids: [],
      priority: "Medium",
      status: "Scheduled",
      all_day: false,
      start_date: today,
      start_time: "10:00",
      end_date: today,
      end_time: "11:00",
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees_required_csv: "",
      attendees_optional_csv: "",
      reminders: [],
      recurring: false,
    };
  }, [initial]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<EventFormValues>({ defaultValues });

  React.useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  const allDay = watch("all_day");

  const onSubmit: SubmitHandler<EventFormValues> = async (values) => {
    const startISO = joinDateTime(values.start_date, values.start_time, values.time_zone, values.all_day);
    const endISO = joinDateTime(values.end_date, values.end_time, values.time_zone, values.all_day);

    const attendees_required = values.attendees_required_csv
      ? values.attendees_required_csv.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const attendees_optional = values.attendees_optional_csv
      ? values.attendees_optional_csv.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const payload: EventUpsertInput = {
      ...(initial?.id != null ? { id: String(initial.id) } : {}),
      title: values.title.trim(),
      type: values.type,
      description: values.description?.trim() || "",
      location: values.location?.trim() || "",
      department_ids: values.department_ids,
      priority: values.priority,
      status: values.status,
      all_day: Boolean(values.all_day),
      start_at: startISO,
      end_at: endISO,
      time_zone: values.time_zone,
      attendees_required,
      attendees_optional,
      reminders: values.reminders,
    };

    if (upsertEvent) {
      await upsertEvent(payload);
    } else {
      // ✅ Call the FastAPI backend (goes through lib/api.ts -> API_BASE)
      const path = payload.id ? `/api/calendar/events/${payload.id}` : `/api/calendar/events`;
      await api(path, {
        method: payload.id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
    }

    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Event" : "Add Event"}</DialogTitle>
        </DialogHeader>

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="md:col-span-2">
            <Label htmlFor="title">Event Title</Label>
            <Input id="title" {...register("title", { required: true, minLength: 2, maxLength: 200 })} />
          </div>

          <div>
            <Label>Event Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Audit",
                      "Risk Assessment",
                      "Training Session",
                      "Compliance Review",
                      "Document Review",
                      "Incident Investigation",
                      "Meeting",
                      "Deadline",
                      "Other",
                    ].map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label>Priority</Label>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Low", "Medium", "High", "Critical"] as const).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Scheduled", "In Progress", "Completed", "Cancelled"] as const).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} />
          </div>

          <div className="md:col-span-2">
            <Label>All Day Event</Label>
            <Controller
              control={control}
              name="all_day"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input type="date" id="start_date" {...register("start_date", { required: true })} />
          </div>

          {!allDay && (
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input type="time" id="start_time" {...register("start_time", { required: !allDay })} />
            </div>
          )}

          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input type="date" id="end_date" {...register("end_date", { required: true })} />
          </div>

          {!allDay && (
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input type="time" id="end_time" {...register("end_time", { required: !allDay })} />
            </div>
          )}

          <div className="md:col-span-2">
            <Label htmlFor="time_zone">Time Zone</Label>
            <Input id="time_zone" placeholder="e.g., Asia/Kolkata" {...register("time_zone")} />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="attendees_required_csv">Required Attendees (comma separated)</Label>
            <Input id="attendees_required_csv" {...register("attendees_required_csv")} />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="attendees_optional_csv">Optional Attendees (comma separated)</Label>
            <Input id="attendees_optional_csv" {...register("attendees_optional_csv")} />
          </div>

          <div className="md:col-span-2">
            <Label>Reminders</Label>
            <Controller
              control={control}
              name="reminders"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {REMINDER_OPTIONS_MIN.map((min) => {
                    const checked = field.value.includes(min);
                    return (
                      <label key={min} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const next = new Set<number>(field.value);
                            if (e.target.checked) next.add(min);
                            else next.delete(min);
                            field.onChange(Array.from(next));
                          }}
                        />
                        {min < 60
                          ? `${min} minutes`
                          : min < 24 * 60
                          ? `${min / 60} hour${min === 60 ? "" : "s"}`
                          : `${min / (24 * 60)} day${min === 24 * 60 ? "" : "s"}`}
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Recurring</Label>
            <Controller
              control={control}
              name="recurring"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? "Saving…" : initial?.id ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
