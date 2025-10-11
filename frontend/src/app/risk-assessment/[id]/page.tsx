"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { api } from '@/lib/api'
import {
  RiskAIScoreCountryRequest,
  RiskAIScoreCountryResponse,
  RiskAssessmentCountryDetail,
  RiskAssessmentDetail,
  RiskConfidence,
  RiskLevel,
  RiskTrend,
} from '@/types/risk'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCcw, Save, Sparkles } from 'lucide-react'

const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical']
const TRENDS: RiskTrend[] = ['improving', 'stable', 'deteriorating']
const CONFIDENCE: RiskConfidence[] = ['low', 'medium', 'high']

interface CategoryFormValue {
  id: number
  category_key: string
  category_name: string
  score: number | null
  trend: RiskTrend | null
  confidence: RiskConfidence | null
  evidence: string | null
  update_source?: string | null
}

interface CountryFormState {
  country_code: string
  country_name: string
  overall_score: number | null
  risk_level: RiskLevel | null
  trend: RiskTrend | null
  confidence: RiskConfidence | null
  comments: string | null
  evidence: string | null
  next_review_date: string | null
  categories: CategoryFormValue[]
}

function buildFormState(country: RiskAssessmentCountryDetail): CountryFormState {
  return {
    country_code: country.country_code,
    country_name: country.country_name,
    overall_score: country.overall_score ?? null,
    risk_level: country.risk_level ?? null,
    trend: country.trend ?? null,
    confidence: country.confidence ?? null,
    comments: country.comments ?? '',
    evidence: country.evidence ?? '',
    next_review_date: country.next_review_date ?? '',
    categories: country.category_scores.map((score) => ({
      id: score.id,
      category_key: score.category_key,
      category_name: score.category_name,
      score: score.score ?? null,
      trend: score.trend ?? null,
      confidence: score.confidence ?? null,
      evidence: score.evidence ?? '',
      update_source: score.update_source ?? undefined,
    })),
  }
}

export default function RiskAssessmentExecutionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const assessmentId = Number(params?.id)
  const [assessment, setAssessment] = useState<RiskAssessmentDetail | undefined>()
  const [selectedCountryId, setSelectedCountryId] = useState<number | undefined>()
  const [formState, setFormState] = useState<CountryFormState | undefined>()
  const [aiSummary, setAiSummary] = useState<RiskAIScoreCountryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (!assessmentId) {
      router.push('/risk-assessment')
      return
    }
    const load = async () => {
      try {
        const data = await api<RiskAssessmentDetail>(`/risk-assessments/${assessmentId}`)
        setAssessment(data)
        if (data.countries.length) {
          setSelectedCountryId(data.countries[0].id)
          setFormState(buildFormState(data.countries[0]))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load assessment')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [assessmentId, router])

  const selectedCountry: RiskAssessmentCountryDetail | undefined = useMemo(() => {
    if (!assessment || !selectedCountryId) return undefined
    return assessment.countries.find((country) => country.id === selectedCountryId)
  }, [assessment, selectedCountryId])

  useEffect(() => {
    if (selectedCountry) {
      setFormState(buildFormState(selectedCountry))
    }
  }, [selectedCountry])

  const handleCategoryChange = (index: number, value: Partial<CategoryFormValue>) => {
    setFormState((prev) => {
      if (!prev) return prev
      const categories = prev.categories.map((category, idx) => (idx === index ? { ...category, ...value } : category))
      return { ...prev, categories }
    })
  }

  const handleFieldChange = (field: keyof CountryFormState, value: string | number | RiskLevel | RiskTrend | RiskConfidence | null) => {
    setFormState((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleSave = async () => {
    if (!formState || !assessmentId) return
    setSaving(true)
    try {
      await api(`/risk-assessments/${assessmentId}/countries`, {
        method: 'POST',
        body: JSON.stringify({
          country_code: formState.country_code,
          country_name: formState.country_name,
          overall_score: formState.overall_score,
          risk_level: formState.risk_level,
          trend: formState.trend,
          confidence: formState.confidence,
          comments: formState.comments,
          evidence: formState.evidence,
          next_review_date: formState.next_review_date || undefined,
          category_scores: formState.categories.map((category) => ({
            category_key: category.category_key,
            category_name: category.category_name,
            score: category.score,
            trend: category.trend,
            confidence: category.confidence,
            evidence: category.evidence,
          })),
        }),
      })
      const refreshed = await api<RiskAssessmentDetail>(`/risk-assessments/${assessmentId}`)
      setAssessment(refreshed)
      const updated = refreshed.countries.find((country) => country.country_code === formState.country_code)
      if (updated) {
        setSelectedCountryId(updated.id)
        setFormState(buildFormState(updated))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAiScore = async () => {
    if (!formState) return
    setAiLoading(true)
    try {
      const payload: RiskAIScoreCountryRequest = {
        country_name: formState.country_name,
        categories: formState.categories.map((category) => ({
          category_key: category.category_key,
          category_name: category.category_name,
          score: category.score ?? 0,
          weight: undefined,
          trend: (category.trend ?? 'stable') as RiskAIScoreCountryRequest['categories'][number]['trend'],
          confidence: (category.confidence ?? 'medium') as RiskAIScoreCountryRequest['categories'][number]['confidence'],
        })),
      }
      const result = await api<RiskAIScoreCountryResponse>('/risk-assessments/ai/score-country', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setAiSummary(result)
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !assessment || !formState) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-red-50/70">
            <CardContent className="p-4 text-sm text-red-700">{error ?? 'Assessment not found.'}</CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{assessment.title}</h1>
            <p className="text-sm text-muted-foreground">
              Assessment period {new Date(assessment.period_start).toLocaleDateString()} – {new Date(assessment.period_end).toLocaleDateString()} · {assessment.update_frequency}
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800">{assessment.status.toUpperCase()}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <Card className="border-emerald-100">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">Country assessment</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={selectedCountryId ? String(selectedCountryId) : ''}
                    onValueChange={(value) => setSelectedCountryId(Number(value))}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {assessment.countries.map((country) => (
                        <SelectItem key={country.id} value={String(country.id)}>
                          {country.country_name} ({country.country_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleAiScore} disabled={aiLoading}>
                    <Sparkles className="mr-2 h-4 w-4" /> AI suggest scores
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save updates
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Overall score</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formState.overall_score ?? ''}
                      onChange={(event) => handleFieldChange('overall_score', event.target.value ? Number(event.target.value) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Risk level</Label>
                    <Select
                      value={formState.risk_level ?? ''}
                      onValueChange={(value) => handleFieldChange('risk_level', value as RiskLevel)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map((level) => (
                          <SelectItem key={level} value={level} className="capitalize">
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Trend</Label>
                    <Select
                      value={formState.trend ?? ''}
                      onValueChange={(value) => handleFieldChange('trend', value as RiskTrend)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRENDS.map((trend) => (
                          <SelectItem key={trend} value={trend} className="capitalize">
                            {trend}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Confidence</Label>
                    <Select
                      value={formState.confidence ?? ''}
                      onValueChange={(value) => handleFieldChange('confidence', value as RiskConfidence)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONFIDENCE.map((item) => (
                          <SelectItem key={item} value={item} className="capitalize">
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Next review date</Label>
                    <Input
                      type="date"
                      value={formState.next_review_date ?? ''}
                      onChange={(event) => handleFieldChange('next_review_date', event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Comments</Label>
                  <Textarea
                    value={formState.comments ?? ''}
                    onChange={(event) => handleFieldChange('comments', event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Evidence / sources</Label>
                  <Textarea
                    value={formState.evidence ?? ''}
                    onChange={(event) => handleFieldChange('evidence', event.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-800">Risk categories</Label>
                  {formState.categories.map((category, index) => (
                    <Card key={category.id} className="border-slate-200">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{category.category_name}</div>
                            <div className="text-xs uppercase text-muted-foreground">{category.category_key}</div>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Score</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={category.score ?? ''}
                              onChange={(event) =>
                                handleCategoryChange(index, {
                                  score: event.target.value ? Number(event.target.value) : null,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Trend</Label>
                            <Select
                              value={category.trend ?? ''}
                              onValueChange={(value) => handleCategoryChange(index, { trend: value as RiskTrend })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {TRENDS.map((trend) => (
                                  <SelectItem key={trend} value={trend} className="capitalize">
                                    {trend}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Confidence</Label>
                            <Select
                              value={category.confidence ?? ''}
                              onValueChange={(value) => handleCategoryChange(index, { confidence: value as RiskConfidence })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {CONFIDENCE.map((item) => (
                                  <SelectItem key={item} value={item} className="capitalize">
                                    {item}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Evidence</Label>
                            <Textarea
                              value={category.evidence ?? ''}
                              onChange={(event) => handleCategoryChange(index, { evidence: event.target.value })}
                              rows={3}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {aiSummary ? (
              <Card className="border-purple-200 bg-purple-50/70">
                <CardHeader>
                  <CardTitle className="text-base text-purple-900">AI projection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-purple-900">
                  <div>
                    Predicted score {aiSummary.overall_score?.toFixed(1) ?? 'n/a'} ({aiSummary.risk_level.toUpperCase()}) with {aiSummary.confidence} confidence. Trend {aiSummary.predicted_trend}.
                  </div>
                  <ul className="list-disc pl-5">
                    {aiSummary.insights.map((insight, idx) => (
                      <li key={`ai-insight-${idx}`}>{insight}</li>
                    ))}
                  </ul>
                  {aiSummary.alerts.length ? (
                    <ul className="list-disc pl-5 text-red-700">
                      {aiSummary.alerts.map((alert, idx) => (
                        <li key={`ai-alert-${idx}`}>{alert}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Assessment metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800">Assessor:</span> User #{assessment.assigned_assessor_id}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Review team:</span> {assessment.review_team_ids.length ? assessment.review_team_ids.join(', ') : 'Not assigned'}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Scoring scale:</span> {assessment.scoring_scale}
                  {assessment.custom_scoring_scale ? ` (${assessment.custom_scoring_scale})` : ''}
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">Impact levels</span>
                  <ul className="list-disc pl-5">
                    {assessment.impact_scale.map((entry, idx) => (
                      <li key={`impact-${idx}`}>{entry.label}: {entry.description}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800">Probability levels</span>
                  <ul className="list-disc pl-5">
                    {assessment.probability_scale.map((entry, idx) => (
                      <li key={`prob-${idx}`}>{entry.label}: {entry.description}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">Data sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <ul className="list-disc pl-5">
                  <li>World Bank Indicators (updated weekly)</li>
                  <li>IMF Country Reports (updated quarterly)</li>
                  <li>Transparency International (latest index)</li>
                  <li>Local news intelligence feed (daily)</li>
                </ul>
                <Button variant="outline" className="w-full" onClick={() => alert('External data refresh queued.')}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh external data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
