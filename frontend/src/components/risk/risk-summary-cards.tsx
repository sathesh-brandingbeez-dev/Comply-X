import { Card, CardContent } from '@/components/ui/card'
import { RiskAssessmentSummaryCards } from '@/types/risk'
import { Clock, Globe2, ShieldAlert, TrendingUp } from 'lucide-react'

interface RiskSummaryCardsProps {
  summary: RiskAssessmentSummaryCards | undefined
  loading?: boolean
}

const METADATA = [
  {
    key: 'total_countries_assessed' as const,
    label: 'Total Countries Assessed',
    icon: Globe2,
    accent: 'text-emerald-600',
  },
  {
    key: 'high_risk_countries' as const,
    label: 'High Risk Countries',
    icon: ShieldAlert,
    accent: 'text-red-600',
  },
  {
    key: 'recent_risk_changes' as const,
    label: 'Recent Risk Changes (30 days)',
    icon: TrendingUp,
    accent: 'text-orange-500',
  },
] as const

export function RiskSummaryCards({ summary, loading }: RiskSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {METADATA.map((item) => {
        const Icon = item.icon
        const value = summary?.[item.key] ?? 0
        return (
          <Card key={item.key} className="border-emerald-100 bg-gradient-to-br from-white via-emerald-50/50 to-white">
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                <Icon className={`h-5 w-5 ${item.accent}`} />
              </div>
              <p className="text-3xl font-semibold text-slate-900">
                {loading ? '—' : value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )
      })}
      <Card className="border-emerald-100 bg-gradient-to-br from-white via-sky-50/70 to-white">
        <CardContent className="flex h-full flex-col justify-between p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Next Assessment Due</p>
            <Clock className="h-5 w-5 text-sky-600" />
          </div>
          <p className="text-lg font-semibold text-slate-900">
            {summary?.next_assessment_due
              ? new Date(summary.next_assessment_due).toLocaleDateString()
              : loading
                ? '—'
                : 'Not scheduled'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
