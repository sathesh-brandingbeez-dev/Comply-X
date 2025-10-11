import { AlertTriangle, Bot } from 'lucide-react'

interface RiskAIAlertsProps {
  alerts: string[]
}

export function RiskAIAlerts({ alerts }: RiskAIAlertsProps) {
  if (!alerts.length) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
        <Bot className="h-5 w-5" /> AI monitoring active – no critical alerts detected.
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
        <AlertTriangle className="h-4 w-4" /> AI alerts
      </div>
      <ul className="space-y-1 text-sm text-amber-900">
        {alerts.map((alert, index) => (
          <li key={`${alert}-${index}`} className="leading-snug">
            • {alert}
          </li>
        ))}
      </ul>
    </div>
  )
}
