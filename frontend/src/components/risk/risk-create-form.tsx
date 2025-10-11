"use client"

import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  RiskAssessmentCategoryWeight,
  RiskAssessmentOptionsResponse,
  RiskAssessmentScaleEntry,
  RiskAssessmentType,
  RiskScoringScale,
} from '@/types/risk'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import sharedCountryCatalogue from '@shared/data/default_countries.json'

const FALLBACK_COUNTRIES = (sharedCountryCatalogue as { code: string; name: string }[]).map((entry) => ({
  code: entry.code.toUpperCase(),
  name: entry.name,
}))

interface RiskCreateFormProps {
  options: RiskAssessmentOptionsResponse
  loading?: boolean
  onSubmit: (payload: {
    title: string
    country_codes: string[]
    assessment_type: RiskAssessmentType
    assessment_framework?: string
    period_start: string
    period_end: string
    update_frequency: string
    assigned_assessor_id: number
    review_team_ids: number[]
    scoring_scale: RiskScoringScale
    custom_scoring_scale?: string
    impact_scale: RiskAssessmentScaleEntry[]
    probability_scale: RiskAssessmentScaleEntry[]
    categories: RiskAssessmentCategoryWeight[]
  }) => Promise<void>
  onSuggestWeights: (assessmentType: RiskAssessmentType, categories: RiskAssessmentCategoryWeight[]) => Promise<RiskAssessmentCategoryWeight[] | undefined>
}

function normaliseScale(entries: RiskAssessmentScaleEntry[]): RiskAssessmentScaleEntry[] {
  return entries.map((entry) => ({
    label: entry.label,
    description: entry.description,
  }))
}

export function RiskCreateForm({ options, loading, onSubmit, onSuggestWeights }: RiskCreateFormProps) {
  const defaults = options.defaults
  const [title, setTitle] = useState('')
  const [assessmentType, setAssessmentType] = useState<RiskAssessmentType>('comprehensive')
  const [framework, setFramework] = useState<string | undefined>()
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [updateFrequency, setUpdateFrequency] = useState('Quarterly')
  const [assignedAssessor, setAssignedAssessor] = useState<number | undefined>()
  const [reviewTeam, setReviewTeam] = useState<number[]>([])
  const [scoringScale, setScoringScale] = useState<RiskScoringScale>('1-100')
  const [customScoringScale, setCustomScoringScale] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [categories, setCategories] = useState<RiskAssessmentCategoryWeight[]>(() =>
    defaults.categories.map((category, index) => ({ ...category, order_index: index }))
  )
  const [impactScale, setImpactScale] = useState<RiskAssessmentScaleEntry[]>(() => normaliseScale(defaults.impact_scale))
  const [probabilityScale, setProbabilityScale] = useState<RiskAssessmentScaleEntry[]>(() => normaliseScale(defaults.probability_scale))
  const [submitting, setSubmitting] = useState(false)
  const [weightGuidance, setWeightGuidance] = useState<string | undefined>()

  const filteredCountries = useMemo(() => {
    const baseCountries = options.countries.length ? options.countries : FALLBACK_COUNTRIES
    const searchTerm = countrySearch.trim().toLowerCase()
    if (!searchTerm) return baseCountries
    return baseCountries.filter((country) => {
      const name = country.name?.toLowerCase() ?? ''
      const code = country.code?.toLowerCase() ?? ''
      return name.includes(searchTerm) || code.includes(searchTerm)
    })
  }, [countrySearch, options.countries])

  const handleCountrySearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const topMatch = filteredCountries[0]
      if (topMatch) {
        toggleCountry(topMatch.code)
      }
    }
  }

  const invalidPeriodRange = Boolean(periodStart && periodEnd && periodEnd < periodStart)

  useEffect(() => {
    if (periodStart && periodEnd && periodEnd < periodStart) {
      setPeriodEnd(periodStart)
    }
  }, [periodStart, periodEnd])

  const toggleCountry = (code: string) => {
    const normalised = code.toUpperCase()
    setSelectedCountries((prev) =>
      prev.includes(normalised)
        ? prev.filter((countryCode) => countryCode !== normalised)
        : [...prev, normalised]
    )
  }

  const toggleReviewMember = (id: number) => {
    setReviewTeam((prev) =>
      prev.includes(id) ? prev.filter((member) => member !== id) : [...prev, id]
    )
  }

  const handleCategoryChange = (index: number, value: Partial<RiskAssessmentCategoryWeight>) => {
    setCategories((prev) => prev.map((category, idx) => (idx === index ? { ...category, ...value } : category)))
  }

  const handleScaleChange = (
    type: 'impact' | 'probability',
    index: number,
    value: Partial<RiskAssessmentScaleEntry>,
  ) => {
    if (type === 'impact') {
      setImpactScale((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, ...value } : entry)))
    } else {
      setProbabilityScale((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, ...value } : entry)))
    }
  }

  const handleSuggestWeights = async () => {
    const result = await onSuggestWeights(assessmentType, categories)
    if (!result) return
    setCategories(result.map((category, index) => ({ ...category, order_index: index })))
    setWeightGuidance('Weights updated using AI guidance tuned for the selected assessment type.')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!assignedAssessor) return
    if (!periodStart || !periodEnd) return
    if (invalidPeriodRange) return
    if (!selectedCountries.length) return

    const payload = {
      title,
      country_codes: selectedCountries,
      assessment_type: assessmentType,
      assessment_framework: framework,
      period_start: periodStart,
      period_end: periodEnd,
      update_frequency: updateFrequency,
      assigned_assessor_id: assignedAssessor,
      review_team_ids: reviewTeam,
      scoring_scale: scoringScale,
      custom_scoring_scale: scoringScale === 'custom' ? customScoringScale : undefined,
      impact_scale: impactScale,
      probability_scale: probabilityScale,
      categories,
    }

    try {
      setSubmitting(true)
      await onSubmit(payload)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Assessment configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Assessment title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Q2 Country Compliance Heatmap"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Assessment type *</Label>
            <Select value={assessmentType} onValueChange={(value) => setAssessmentType(value as RiskAssessmentType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select assessment type" />
              </SelectTrigger>
              <SelectContent>
                {defaults.assessment_types.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assessment framework</Label>
             <Select
              value={framework ?? 'none'}
              onValueChange={(value) => setFramework(value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="ISO 31000 Risk Management">ISO 31000 Risk Management</SelectItem>
                <SelectItem value="COSO Enterprise Risk Management">COSO Enterprise Risk Management</SelectItem>
                <SelectItem value="NIST Risk Management Framework">NIST Risk Management Framework</SelectItem>
                <SelectItem value="Custom Framework">Custom Framework</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-start">Assessment period *</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">Period end *</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                min={periodStart || undefined}
                onChange={(event) => setPeriodEnd(event.target.value)}
                required
              />
              {invalidPeriodRange ? (
                <p className="text-xs text-red-600">Period end must be the same as or after the assessment period.</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Update frequency *</Label>
            <Select value={updateFrequency} onValueChange={setUpdateFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {defaults.update_frequencies.map((frequency) => (
                  <SelectItem key={frequency} value={frequency}>
                    {frequency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assigned assessor *</Label>
            <Select value={assignedAssessor ? String(assignedAssessor) : ''} onValueChange={(value) => setAssignedAssessor(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select assessor" />
              </SelectTrigger>
              <SelectContent>
                {options.users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Country selection *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr,2fr]">
            <div className="space-y-2">
              <Label htmlFor="country-search">Search countries</Label>
              <Input
                id="country-search"
                placeholder="Filter by name or ISO code"
                value={countrySearch}
                onChange={(event) => setCountrySearch(event.target.value)}
                onKeyDown={handleCountrySearchKeyDown}
              />
              <p className="text-xs text-muted-foreground">
                {selectedCountries.length} selected
              </p>
            </div>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 text-sm">
              {filteredCountries.length ? (
                filteredCountries.map((country) => {
                  const checked = selectedCountries.includes(country.code)
                  return (
                    <button
                      type="button"
                      key={country.code}
                      onClick={() => toggleCountry(country.code)}
                      className={`flex items-center justify-between rounded border px-2 py-1 text-left text-xs transition ${
                        checked
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-transparent hover:border-emerald-200'
                      }`}
                    >
                      <span>{country.name}</span>
                      {checked ? <Badge className="bg-emerald-500 text-white">Selected</Badge> : null}
                    </button>
                  )
                })
              ) : (
                <p className="col-span-2 rounded border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-muted-foreground">
                  No countries match "{countrySearch.trim()}".
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-100">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">Risk criteria matrix</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleSuggestWeights}>
            <Sparkles className="mr-2 h-4 w-4" /> AI optimise weights
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {weightGuidance ? (
            <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3 text-xs text-purple-800">
              {weightGuidance}
            </div>
          ) : null}
          <div className="space-y-3">
            {categories.map((category, index) => (
              <div key={category.category_key} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Input
                    value={category.display_name}
                    onChange={(event) => handleCategoryChange(index, { display_name: event.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Key</Label>
                  <Input
                    value={category.category_key}
                    onChange={(event) => handleCategoryChange(index, { category_key: event.target.value.toLowerCase() })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Weight (%)</Label>
                  <Input
                    type="number"
                    value={category.weight}
                    min={0}
                    max={100}
                    onChange={(event) => handleCategoryChange(index, { weight: Number(event.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Baseline guidance</Label>
                  <Input
                    value={category.baseline_guidance ?? ''}
                    onChange={(event) => handleCategoryChange(index, { baseline_guidance: event.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Scoring scale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={scoringScale} onValueChange={(value) => setScoringScale(value as RiskScoringScale)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {defaults.scoring_scales.map((scale) => (
                  <SelectItem key={scale} value={scale}>
                    {scale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {scoringScale === 'custom' ? (
              <Input
                placeholder="Describe custom scoring (e.g., 1-7 maturity scale)"
                value={customScoringScale}
                onChange={(event) => setCustomScoringScale(event.target.value)}
              />
            ) : null}
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Review team</CardTitle>
          </CardHeader>
          <CardContent className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto text-sm">
            {options.users.map((user) => {
              const checked = reviewTeam.includes(user.id)
              return (
                <button
                  type="button"
                  key={user.id}
                  onClick={() => toggleReviewMember(user.id)}
                  className={`flex items-center justify-between rounded border px-3 py-2 text-left transition ${
                    checked ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.department ?? user.role}</p>
                  </div>
                  {checked ? <Badge className="bg-emerald-500 text-white">Added</Badge> : null}
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Impact levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {impactScale.map((entry, index) => (
              <div key={`impact-${index}`} className="space-y-2">
                <Input
                  value={entry.label}
                  onChange={(event) => handleScaleChange('impact', index, { label: event.target.value })}
                  placeholder="Label"
                />
                <Textarea
                  value={entry.description}
                  onChange={(event) => handleScaleChange('impact', index, { description: event.target.value })}
                  placeholder="Definition"
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Probability levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {probabilityScale.map((entry, index) => (
              <div key={`probability-${index}`} className="space-y-2">
                <Input
                  value={entry.label}
                  onChange={(event) => handleScaleChange('probability', index, { label: event.target.value })}
                  placeholder="Label"
                />
                <Textarea
                  value={entry.description}
                  onChange={(event) => handleScaleChange('probability', index, { description: event.target.value })}
                  placeholder="Definition"
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            submitting ||
            loading ||
            !selectedCountries.length ||
            !assignedAssessor ||
            !periodStart ||
            !periodEnd ||
            invalidPeriodRange
          }
        >
          {submitting ? 'Creating assessment…' : 'Create assessment'}
        </Button>
      </div>
    </form>
  )
}
