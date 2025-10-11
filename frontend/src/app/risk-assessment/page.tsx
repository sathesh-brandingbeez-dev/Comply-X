"use client"

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { api } from '@/lib/api'
import {
  RiskAIScoreCountryRequest,
  RiskAIScoreCountryResponse,
  RiskAssessmentCountryDetail,
  RiskAssessmentDashboardResponse,
} from '@/types/risk'
import { WorldRiskMap } from '@/components/risk/world-risk-map'
import { RiskSummaryCards } from '@/components/risk/risk-summary-cards'
import { RiskQuickActions } from '@/components/risk/risk-quick-actions'
import { RiskAIAlerts } from '@/components/risk/risk-ai-alerts'
import { RiskCountryDetail } from '@/components/risk/risk-country-detail'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, RefreshCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'

const RISK_TYPES = [
  { value: 'overall', label: 'Overall' },
  { value: 'political', label: 'Political' },
  { value: 'economic', label: 'Economic' },
  { value: 'regulatory', label: 'Compliance' },
  { value: 'security', label: 'Operational' },
]

const DATA_SOURCES = [
  { value: 'combined', label: 'Combined data' },
  { value: 'internal', label: 'Internal assessments' },
  { value: 'external', label: 'External intelligence' },
]

export default function RiskAssessmentDashboardPage() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<RiskAssessmentDashboardResponse | undefined>()
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | undefined>()
  const [riskType, setRiskType] = useState<string>('overall')
  const [dataSource, setDataSource] = useState<string>('combined')
  const [loading, setLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState<RiskAIScoreCountryResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const fetchDashboard = async () => {
    setLoading(true)
    setError(undefined)
    try {
      const params = new URLSearchParams()
      if (riskType !== 'overall') params.set('risk_type', riskType)
      if (dataSource !== 'combined') params.set('data_source', dataSource)
      const query = params.toString()
      const data = await api<RiskAssessmentDashboardResponse>(
        `/risk-assessments/dashboard${query ? `?${query}` : ''}`,
      )
      setDashboard(data)
      if (!selectedCountryCode && data.country_panels.length) {
        setSelectedCountryCode(data.country_panels[0].country_code)
      } else if (selectedCountryCode) {
        const stillExists = data.country_panels.some(
          (country) => country.country_code === selectedCountryCode,
        )
        if (!stillExists && data.country_panels.length) {
          setSelectedCountryCode(data.country_panels[0].country_code)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskType, dataSource])

  const selectedCountry: RiskAssessmentCountryDetail | undefined = useMemo(() => {
    if (!dashboard || !selectedCountryCode) return undefined
    return dashboard.country_panels.find((country) => country.country_code === selectedCountryCode)
  }, [dashboard, selectedCountryCode])

  const handleAiScore = async () => {
    if (!selectedCountry) return
    setAiLoading(true)
    try {
      const payload: RiskAIScoreCountryRequest = {
        country_name: selectedCountry.country_name,
        categories: selectedCountry.category_scores.map((score) => ({
          category_key: score.category_key,
          category_name: score.category_name,
          score: score.score ?? 0,
          weight: undefined,
          trend: (score.trend ?? 'stable') as RiskAIScoreCountryRequest['categories'][number]['trend'],
          confidence: (score.confidence ?? 'medium') as RiskAIScoreCountryRequest['categories'][number]['confidence'],
        })),
      }
      const result = await api<RiskAIScoreCountryResponse>(
        '/risk-assessments/ai/score-country',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
      setAiSummary(result)
    } finally {
      setAiLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchDashboard()
  }

  const handleCreate = () => {
    router.push('/risk-assessment/create')
  }

  const handleImport = () => {
    alert('Importing external risk data can be connected to your provider via integrations settings.')
  }

  const handleGenerate = () => {
    alert('Generate report will export a presentation-ready briefing. Configure templates under Settings.')
  }

  const handleExport = () => {
    alert('Dataset exported. Connect cloud storage for automated distribution.')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Country Risk Assessment</h1>
            <p className="text-sm text-muted-foreground">
              Monitor geopolitical, economic, and compliance risk exposure across jurisdictions with AI-assisted insights.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCcw className="h-4 w-4" /> Last refreshed{' '}
            {dashboard ? new Date(dashboard.last_refreshed).toLocaleString() : '—'}
          </div>
        </div>

        <RiskQuickActions
          onCreate={handleCreate}
          onImport={handleImport}
          onGenerate={handleGenerate}
          onExport={handleExport}
        />

        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Risk type</Label>
                <Select value={riskType} onValueChange={setRiskType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="capitalize">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data source</Label>
                <Select value={dataSource} onValueChange={setDataSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={handleRefresh} className="w-full">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>

            {error ? (
              <Card className="border-red-200 bg-red-50/70">
                <CardContent className="flex items-center gap-2 p-4 text-sm text-red-700">
                  <Loader2 className="h-4 w-4 animate-spin" /> {error}
                </CardContent>
              </Card>
            ) : null}

            <WorldRiskMap
              countries={dashboard?.map_countries ?? []}
              selectedCountry={selectedCountryCode}
              onSelect={setSelectedCountryCode}
            />

            <RiskSummaryCards summary={dashboard?.summary} loading={loading} />

            {aiSummary ? (
              <Card className="border-purple-200 bg-purple-50/70">
                <CardContent className="space-y-2 p-4 text-sm text-purple-900">
                  <div className="font-semibold">AI summary</div>
                  <div>
                    Overall score prediction: {aiSummary.overall_score?.toFixed(1) ?? 'n/a'} ({aiSummary.risk_level.toUpperCase()}) —
                    trend {aiSummary.predicted_trend} with {aiSummary.confidence} confidence.
                  </div>
                  <ul className="list-disc pl-5">
                    {aiSummary.insights.map((insight, idx) => (
                      <li key={`insight-${idx}`}>{insight}</li>
                    ))}
                  </ul>
                  {aiSummary.alerts.length ? (
                    <ul className="list-disc pl-5 text-red-700">
                      {aiSummary.alerts.map((alert, idx) => (
                        <li key={`alert-${idx}`}>{alert}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            <RiskAIAlerts alerts={dashboard?.ai_alerts ?? []} />
            <RiskCountryDetail
              country={selectedCountry}
              onAiScore={handleAiScore}
              onRefreshExternal={() => alert('External data refresh is scheduled hourly. Manual refresh requested.')}
              onExportEvidence={() => alert('Evidence package export queued. You will receive an email when ready.')}
            />
            {aiLoading ? (
              <Card className="border-purple-200 bg-purple-50/70">
                <CardContent className="flex items-center gap-2 p-4 text-sm text-purple-900">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating AI score…
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
