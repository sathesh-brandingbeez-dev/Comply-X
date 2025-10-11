"use client"

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { api } from '@/lib/api'
import {
  RiskAIWeightSuggestionResponse,
  RiskAssessmentDetail,
  RiskAssessmentOptionsResponse,
  RiskAssessmentType,
  RiskAssessmentCategoryWeight,
} from '@/types/risk'
import { RiskCreateForm } from '@/components/risk/risk-create-form'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RiskAssessmentCreatePage() {
  const router = useRouter()
  const [options, setOptions] = useState<RiskAssessmentOptionsResponse | undefined>()
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api<RiskAssessmentOptionsResponse>('/risk-assessments/options')
        setOptions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load options')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (payload: {
    title: string
    country_codes: string[]
    assessment_type: RiskAssessmentType
    assessment_framework?: string
    period_start: string
    period_end: string
    update_frequency: string
    assigned_assessor_id: number
    review_team_ids: number[]
    scoring_scale: string
    custom_scoring_scale?: string
    impact_scale: { label: string; description: string }[]
    probability_scale: { label: string; description: string }[]
    categories: RiskAssessmentCategoryWeight[]
  }) => {
    setSubmitLoading(true)
    try {
      const response = await api<RiskAssessmentDetail>('/risk-assessments', {
        method: 'POST',
        body: JSON.stringify({
          title: payload.title,
          country_codes: payload.country_codes,
          assessment_type: payload.assessment_type,
          assessment_framework: payload.assessment_framework,
          period_start: payload.period_start,
          period_end: payload.period_end,
          update_frequency: payload.update_frequency,
          assigned_assessor_id: payload.assigned_assessor_id,
          review_team_ids: payload.review_team_ids,
          scoring_scale: payload.scoring_scale,
          custom_scoring_scale: payload.custom_scoring_scale,
          impact_scale: payload.impact_scale,
          probability_scale: payload.probability_scale,
          categories: payload.categories,
        }),
      })
      router.push(`/risk-assessment/${response.id}`)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleSuggestWeights = async (
    assessmentType: RiskAssessmentType,
    categories: RiskAssessmentCategoryWeight[],
  ): Promise<RiskAssessmentCategoryWeight[] | undefined> => {
    try {
      const response = await api<RiskAIWeightSuggestionResponse>('/risk-assessments/ai/suggest-weights', {
        method: 'POST',
        body: JSON.stringify({
          assessment_type: assessmentType,
          categories: categories.map((category) => category.category_key),
        }),
      })
      return response.weights
    } catch (err) {
      console.error(err)
      alert('Unable to fetch AI weight suggestions at the moment.')
      return undefined
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create country risk assessment</h1>
          <p className="text-sm text-muted-foreground">
            Configure the assessment scope, weighting, and monitoring cadence. AI can auto-tune category weights for your focus area.
          </p>
        </div>

        {loading || !options ? (
          <Card className="border-emerald-200 bg-emerald-50/70">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-emerald-900">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assessment configuration…
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-red-50/70">
            <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : (
          <RiskCreateForm
            options={options}
            loading={submitLoading}
            onSubmit={handleSubmit}
            onSuggestWeights={handleSuggestWeights}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
