export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type RiskTrend = 'improving' | 'stable' | 'deteriorating'
export type RiskConfidence = 'low' | 'medium' | 'high'
export type RiskUpdateSource = 'manual' | 'external_data' | 'ai_analysis'

export type RiskAssessmentType =
  | 'comprehensive'
  | 'political'
  | 'economic'
  | 'compliance'
  | 'operational'
  | 'custom'

export type RiskScoringScale = '1-5' | '1-10' | '1-100' | 'custom'

export interface RiskAssessmentScaleEntry {
  label: string
  description: string
}

export interface RiskAssessmentCategoryWeight {
  category_key: string
  display_name: string
  weight: number
  order_index: number
  baseline_guidance?: string | null
}

export interface RiskAssessmentCountryCategoryScore {
  id: number
  category_key: string
  category_name: string
  score?: number | null
  trend?: RiskTrend | null
  confidence?: RiskConfidence | null
  evidence?: string | null
  last_updated?: string | null
  update_source?: RiskUpdateSource | null
}

export interface RiskAssessmentCountryDetail {
  id: number
  country_code: string
  country_name: string
  overall_score?: number | null
  risk_level?: RiskLevel | null
  trend?: RiskTrend | null
  confidence?: RiskConfidence | null
  last_updated?: string | null
  update_source?: RiskUpdateSource | null
  evidence?: string | null
  comments?: string | null
  next_review_date?: string | null
  ai_generated: boolean
  category_scores: RiskAssessmentCountryCategoryScore[]
}

export interface RiskAssessmentSummaryCards {
  total_countries_assessed: number
  high_risk_countries: number
  recent_risk_changes: number
  next_assessment_due?: string | null
}

export interface RiskAssessmentMapCountry {
  country_code: string
  country_name: string
  overall_score?: number | null
  risk_level?: RiskLevel | null
  trend?: RiskTrend | null
  confidence?: RiskConfidence | null
  update_source?: RiskUpdateSource | null
}

export interface RiskAssessmentDashboardResponse {
  map_countries: RiskAssessmentMapCountry[]
  summary: RiskAssessmentSummaryCards
  country_panels: RiskAssessmentCountryDetail[]
  ai_alerts: string[]
  last_refreshed: string
}

export interface RiskAssessmentListItem {
  id: number
  title: string
  assessment_type: RiskAssessmentType
  assessment_framework?: string | null
  status: string
  period_start: string
  period_end: string
  update_frequency: string
  country_count: number
  high_risk_countries: number
  updated_at: string
}

export interface RiskAssessmentDetail extends RiskAssessmentListItem {
  scoring_scale: RiskScoringScale
  custom_scoring_scale?: string | null
  impact_scale: RiskAssessmentScaleEntry[]
  probability_scale: RiskAssessmentScaleEntry[]
  categories: RiskAssessmentCategoryWeight[]
  assigned_assessor_id: number
  review_team_ids: number[]
  ai_configuration: Record<string, unknown>
  countries: RiskAssessmentCountryDetail[]
}

export interface RiskAssessmentOptionsResponse {
  countries: { code: string; name: string }[]
  users: { id: number; name: string; role: string; department?: string | null }[]
  defaults: {
    categories: RiskAssessmentCategoryWeight[]
    impact_scale: RiskAssessmentScaleEntry[]
    probability_scale: RiskAssessmentScaleEntry[]
    scoring_scales: RiskScoringScale[]
    assessment_types: RiskAssessmentType[]
    update_frequencies: string[]
  }
}

export interface RiskAIScoringCategory {
  category_key: string
  category_name: string
  score: number
  weight?: number | null
  trend: RiskTrend
  confidence: RiskConfidence
}

export interface RiskAIScoreCountryRequest {
  country_name: string
  categories: RiskAIScoringCategory[]
  recent_events?: string[]
  macro_indicators?: Record<string, number>
}

export interface RiskAIScoreCountryResponse {
  overall_score: number | null
  risk_level: RiskLevel
  predicted_trend: RiskTrend
  confidence: RiskConfidence
  insights: string[]
  alerts: string[]
}

export interface RiskAITrendForecastRequest {
  country_name: string
  historical_scores: number[]
  recent_events?: string[]
}

export interface RiskAITrendForecastResponse {
  projected_score: number
  projected_level: RiskLevel
  predicted_trend: RiskTrend
  narrative: string
  alerts: string[]
}

export interface RiskAIWeightSuggestionResponse {
  weights: RiskAssessmentCategoryWeight[]
  guidance: string[]
}
