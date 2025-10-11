import { Button } from '@/components/ui/button'
import { FileDown, FileUp, PlusCircle, Sparkles } from 'lucide-react'

interface RiskQuickActionsProps {
  onCreate: () => void
  onImport: () => void
  onGenerate: () => void
  onExport: () => void
}

export function RiskQuickActions({ onCreate, onImport, onGenerate, onExport }: RiskQuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={onCreate} className="bg-sky-600 hover:bg-sky-700">
        <PlusCircle className="mr-2 h-4 w-4" /> Create Assessment
      </Button>
      <Button onClick={onImport} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
        <FileUp className="mr-2 h-4 w-4" /> Import Risk Data
      </Button>
      <Button onClick={onGenerate} variant="outline" className="border-purple-600 text-purple-700 hover:bg-purple-50">
        <Sparkles className="mr-2 h-4 w-4" /> Generate Report
      </Button>
      <Button onClick={onExport} variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50">
        <FileDown className="mr-2 h-4 w-4" /> Export Data
      </Button>
    </div>
  )
}
