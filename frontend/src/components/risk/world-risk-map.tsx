"use client"

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RiskAssessmentMapCountry, RiskLevel } from '@/types/risk'
import { CountryCoordinate, RegionKey, getCountryCoordinate } from './country-coordinates'

const MAP_WIDTH = 900
const MAP_HEIGHT = 460

const RISK_COLORS: Record<RiskLevel | 'none', string> = {
  low: '#16a34a',
  medium: '#facc15',
  high: '#fb923c',
  critical: '#ef4444',
  none: '#d4d4d8',
}

const REGION_FILL = {
  americas: '#ecfdf5',
  europe: '#f5f3ff',
  africa: '#fef3c7',
  asia: '#fef2f2',
  oceania: '#e0f2fe',
}

const REGION_SHAPES: Record<'americas' | 'europe' | 'africa' | 'asia' | 'oceania', string> = {
  americas: 'M60 80 L200 40 L260 90 L240 160 L200 220 L180 300 L120 340 L80 280 L50 200 Z',
  europe: 'M260 70 L340 40 L380 70 L360 120 L320 150 L280 120 Z',
  africa: 'M320 160 L380 140 L440 200 L420 320 L360 320 L320 240 Z',
  asia: 'M360 60 L540 60 L620 120 L600 220 L520 260 L420 230 L380 180 Z',
  oceania: 'M560 240 L650 240 L700 300 L650 360 L560 330 Z',
}

function project({ lat, lon }: Pick<CountryCoordinate, 'lat' | 'lon'>) {
  const x = ((lon + 180) / 360) * MAP_WIDTH
  const y = ((90 - lat) / 180) * MAP_HEIGHT
  return { x, y }
}

function resolveRegionGroup(region: RegionKey): keyof typeof REGION_SHAPES {
  if (region === 'americas') return 'americas'
  if (region === 'europe') return 'europe'
  if (region === 'africa') return 'africa'
  if (region === 'oceania') return 'oceania'
  return 'asia'
}

export interface WorldRiskMapProps {
  countries: RiskAssessmentMapCountry[]
  selectedCountry?: string
  onSelect: (countryCode: string) => void
}

export function WorldRiskMap({ countries, selectedCountry, onSelect }: WorldRiskMapProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const markers = useMemo(() => {
    const regionCounts = new Map<RegionKey, number>()
    return countries.map((country) => {
      const coordinate = getCountryCoordinate(country.country_code)
      const { x, y } = project(coordinate)
      const count = regionCounts.get(coordinate.region) ?? 0
      regionCounts.set(coordinate.region, count + 1)
      const offsetX = (count % 4) * 8 - 12
      const offsetY = Math.floor(count / 4) * 8 - 12
      return {
        code: country.country_code,
        name: country.country_name,
        riskLevel: country.risk_level ?? 'none',
        score: country.overall_score,
        coordinate,
        x: x + offsetX,
        y: y + offsetY,
        updateSource: country.update_source,
      }
    })
  }, [countries])

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom((prev) => {
      const next = direction === 'in' ? prev + 0.25 : prev - 0.25
      return Math.min(Math.max(next, 0.6), 2.6)
    })
  }

  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="relative rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Global Risk Map</h3>
          <p className="text-sm text-muted-foreground">Hover or tap markers to review country risk scores.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
            –
          </Button>
          <span className="text-xs font-medium text-muted-foreground">{zoom.toFixed(2)}x</span>
          <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
            +
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50">
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" className="h-[360px] w-full">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#00000022" />
            </filter>
          </defs>
          <g transform={`translate(${pan.x}) scale(${zoom})`}>
            {Object.entries(REGION_SHAPES).map(([region, path]) => (
              <path
                key={region}
                d={path}
                fill={(REGION_FILL as Record<string, string>)[region] ?? '#f1f5f9'}
                stroke="#94a3b8"
                strokeWidth={1.2}
                opacity={0.85}
              />
            ))}
            {markers.map((marker) => {
              const color = RISK_COLORS[(marker.riskLevel as RiskLevel) ?? 'none'] ?? RISK_COLORS.none
              const isSelected = selectedCountry?.toUpperCase() === marker.code.toUpperCase()
              return (
                <g key={marker.code} transform={`translate(${marker.x} ${marker.y})`}>
                  <circle
                    r={isSelected ? 9 : 7}
                    fill={color}
                    stroke={isSelected ? '#1f2937' : '#ffffff'}
                    strokeWidth={isSelected ? 2 : 1.5}
                    className="cursor-pointer transition-transform duration-150 hover:scale-110"
                    onClick={() => onSelect(marker.code)}
                  >
                    <title>
                      {marker.name}
                      {marker.score != null ? `\nScore: ${marker.score.toFixed(1)}` : ''}
                      {marker.riskLevel && marker.riskLevel !== 'none'
                        ? `\nRisk level: ${marker.riskLevel}`
                        : ''}
                      {marker.updateSource ? `\nSource: ${marker.updateSource.replace('_', ' ')}` : ''}
                    </title>
                  </circle>
                  <circle r={isSelected ? 12 : 10} fill="none" stroke="#0f172a0d" strokeWidth={1} />
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {(
            [
              { label: 'Low (0-25)', key: 'low' },
              { label: 'Medium (26-50)', key: 'medium' },
              { label: 'High (51-75)', key: 'high' },
              { label: 'Critical (76-100)', key: 'critical' },
              { label: 'No data available', key: 'none' },
            ] as { label: string; key: keyof typeof RISK_COLORS }[]
          ).map((item) => (
            <span key={item.key} className="flex items-center gap-1">
              <span
                className="inline-flex h-3 w-3 rounded-full"
                style={{ backgroundColor: RISK_COLORS[item.key] }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
