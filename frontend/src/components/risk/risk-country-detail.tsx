import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RiskAssessmentCountryDetail, RiskAssessmentCategoryWeight, RiskLevel, RiskTrend } from '@/types/risk'
import { ArrowUpRight, Download, RefreshCcw, Sparkles } from 'lucide-react'

interface RiskCountryDetailProps {
  country?: RiskAssessmentCountryDetail
  categories?: RiskAssessmentCategoryWeight[]
  onAiScore?: () => void
  onExportEvidence?: () => void
  onRefreshExternal?: () => void
}

const RISK_BADGE: Record<RiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const TREND_LABEL: Record<RiskTrend, { label: string; className: string }> = {
  improving: { label: 'Improving', className: 'text-emerald-600' },
  stable: { label: 'Stable', className: 'text-slate-500' },
  deteriorating: { label: 'Deteriorating', className: 'text-red-600' },
}

export function RiskCountryDetail({
  country,
  categories,
  onAiScore,
  onExportEvidence,
  onRefreshExternal,
}: RiskCountryDetailProps) {
  if (!country) {
    return (
      <Card className="h-full border-emerald-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Country details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select a country on the map to view its full risk profile.</p>
        </CardContent>
      </Card>
    )
  }

  const trendMeta = country.trend ? TREND_LABEL[country.trend] : undefined

  return (
    <Card className="h-full border-emerald-100">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-800">
              {country.country_name}{' '}
              {country.risk_level ? (
                <Badge className={`ml-2 text-xs ${RISK_BADGE[country.risk_level]}`}>
                  {country.risk_level.toUpperCase()}
                </Badge>
              ) : null}
            </CardTitle>
            <p className="text-xs text-muted-foreground uppercase">{country.country_code}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onRefreshExternal?.()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh External Data
            </Button>
            <Button size="sm" variant="outline" onClick={() => onExportEvidence?.()}>
              <Download className="mr-2 h-4 w-4" /> Export Evidence
            </Button>
            <Button size="sm" onClick={() => onAiScore?.()} className="bg-purple-600 text-white hover:bg-purple-700">
              <Sparkles className="mr-2 h-4 w-4" /> AI Score
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>
            Overall score:{' '}
            <span className="font-semibold text-slate-900">
              {country.overall_score != null ? country.overall_score.toFixed(1) : 'Not scored'}
            </span>
          </span>
          {trendMeta ? <span className={`flex items-center gap-1 ${trendMeta.className}`}><ArrowUpRight className="h-3 w-3" /> {trendMeta.label}</span> : null}
          {country.confidence ? <span>Confidence: <span className="font-medium text-slate-900">{country.confidence}</span></span> : null}
          {country.update_source ? <span>Source: {country.update_source.replace('_', ' ')}</span> : null}
          {country.last_updated ? <span>Updated: {new Date(country.last_updated).toLocaleDateString()}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-sm text-emerald-900">
          {country.comments?.trim() || 'No qualitative commentary yet. Add insights from field assessments or AI summaries.'}
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Risk category</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Trend</th>
                <th className="px-4 py-2">Confidence</th>
                <th className="px-4 py-2">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {country.category_scores.map((score) => {
                const category = categories?.find((cat) => cat.category_key === score.category_key)
                const weight = category?.weight
                const trend = score.trend ? TREND_LABEL[score.trend] : undefined
                return (
                  <tr key={score.id} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {score.category_name}
                      {weight != null ? <span className="ml-1 text-xs text-muted-foreground">({weight}% weight)</span> : null}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {score.score != null ? score.score.toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {trend ? <span className={trend.className}>{trend.label}</span> : '—'}
                    </td>
                    <td className="px-4 py-2 capitalize text-slate-600">
                      {score.confidence ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {score.evidence?.slice(0, 80) ?? '—'}
                      {score.evidence && score.evidence.length > 80 ? '…' : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {country.evidence ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Evidence summary:</span> {country.evidence}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
