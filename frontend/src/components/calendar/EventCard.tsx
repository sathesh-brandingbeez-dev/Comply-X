"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // :contentReference[oaicite:34]{index=34}
import { Badge } from "@/components/ui/badge"; // :contentReference[oaicite:35]{index=35}
import { Button } from "@/components/ui/button"; // :contentReference[oaicite:36]{index=36}
import type { CalendarEvent } from "@/types/calendar";

export default function EventCard({ ev, onEdit }: { ev: CalendarEvent; onEdit: ()=>void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {ev.title}
          <Badge variant="secondary">{ev.type}</Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Badge variant="outline">{ev.priority}</Badge>
          <Badge>{ev.status}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {new Date(ev.start_at).toLocaleString()} — {new Date(ev.end_at).toLocaleString()}
        </div>
        <Button size="sm" onClick={onEdit}>Edit</Button>
      </CardContent>
    </Card>
  );
}
