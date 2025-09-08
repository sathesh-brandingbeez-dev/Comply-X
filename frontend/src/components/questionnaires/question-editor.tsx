'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Copy, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Question {
  id: string;
  type: 'text' | 'textarea' | 'multiple_choice' | 'single_choice' | 'rating' | 'yes_no' | 'date' | 'number' | 'email';
  text: string;
  required: boolean;
  order: number;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
  helpText?: string;
  conditionalQuestionId?: string;
  conditionalOperator?: 'equals' | 'not_equals' | 'contains';
  conditionalValue?: string;
  showIfConditionMet?: boolean;
}

interface QuestionEditorProps {
  question: Question;
  index: number;
  questions: Question[];
  onUpdate: (id: string, updates: Partial<Question>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

export function QuestionEditor({
  question,
  index,
  questions,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove
}: QuestionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const updateQuestion = (updates: Partial<Question>) => {
    onUpdate(question.id, updates);
  };

  const addOption = () => {
    const currentOptions = question.options || [];
    updateQuestion({
      options: [...currentOptions, `Option ${currentOptions.length + 1}`]
    });
  };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[optionIndex] = value;
    updateQuestion({ options: newOptions });
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = (question.options || []).filter((_, i) => i !== optionIndex);
    updateQuestion({ options: newOptions });
  };

  const questionTypeLabel = {
    text: 'Short Text',
    textarea: 'Long Text',
    multiple_choice: 'Multiple Choice',
    single_choice: 'Single Choice',
    rating: 'Rating Scale',
    yes_no: 'Yes/No',
    date: 'Date',
    number: 'Number',
    email: 'Email'
  };

  return (
    <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
              <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {questionTypeLabel[question.type]}
            </Badge>
            {question.required && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {index > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMove(index, index - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {index < questions.length - 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMove(index, index + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(question.id)}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(question.id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            {/* Question Text */}
            <div>
              <Label htmlFor={`question-text-${question.id}`}>Question Text *</Label>
              <Textarea
                id={`question-text-${question.id}`}
                value={question.text}
                onChange={(e) => updateQuestion({ text: e.target.value })}
                placeholder="Enter your question"
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Question Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`question-type-${question.id}`}>Question Type</Label>
                <Select 
                  value={question.type} 
                  onValueChange={(value) => updateQuestion({ 
                    type: value as Question['type'],
                    // Reset type-specific fields when changing type
                    options: value === 'multiple_choice' || value === 'single_choice' ? ['Option 1', 'Option 2'] : undefined,
                    minValue: value === 'rating' ? 1 : value === 'number' ? 0 : undefined,
                    maxValue: value === 'rating' ? 5 : value === 'number' ? 100 : undefined
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Short Text</SelectItem>
                    <SelectItem value="textarea">Long Text</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="single_choice">Single Choice</SelectItem>
                    <SelectItem value="rating">Rating Scale</SelectItem>
                    <SelectItem value="yes_no">Yes/No</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id={`required-${question.id}`}
                  checked={question.required}
                  onCheckedChange={(checked) => updateQuestion({ required: checked })}
                />
                <Label htmlFor={`required-${question.id}`}>Required</Label>
              </div>
            </div>

            {/* Type-specific options */}
            {(question.type === 'multiple_choice' || question.type === 'single_choice') && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Options</Label>
                  <Button variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {question.options?.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(optionIndex, e.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                      {question.options!.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(optionIndex)}
                          className="h-10 w-10 p-0 text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(question.type === 'rating' || question.type === 'number') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`min-value-${question.id}`}>
                    {question.type === 'rating' ? 'Minimum Rating' : 'Minimum Value'}
                  </Label>
                  <Input
                    id={`min-value-${question.id}`}
                    type="number"
                    value={question.minValue || ''}
                    onChange={(e) => updateQuestion({ minValue: parseInt(e.target.value) || undefined })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`max-value-${question.id}`}>
                    {question.type === 'rating' ? 'Maximum Rating' : 'Maximum Value'}
                  </Label>
                  <Input
                    id={`max-value-${question.id}`}
                    type="number"
                    value={question.maxValue || ''}
                    onChange={(e) => updateQuestion({ maxValue: parseInt(e.target.value) || undefined })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Advanced Options */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="p-0 h-auto text-sm text-gray-600"
              >
                {isAdvancedOpen ? 'Hide' : 'Show'} Advanced Options
              </Button>

              {isAdvancedOpen && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor={`placeholder-${question.id}`}>Placeholder Text</Label>
                    <Input
                      id={`placeholder-${question.id}`}
                      value={question.placeholder || ''}
                      onChange={(e) => updateQuestion({ placeholder: e.target.value })}
                      placeholder="Enter placeholder text"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`help-text-${question.id}`}>Help Text</Label>
                    <Textarea
                      id={`help-text-${question.id}`}
                      value={question.helpText || ''}
                      onChange={(e) => updateQuestion({ helpText: e.target.value })}
                      placeholder="Provide additional context or instructions"
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  {/* Conditional Logic */}
                  <div>
                    <Label>Conditional Logic</Label>
                    <p className="text-sm text-gray-600 mb-2">Show this question only when certain conditions are met</p>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Select
                        value={question.conditionalQuestionId || 'none'}
                        onValueChange={(value) => updateQuestion({ conditionalQuestionId: value === 'none' ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select question" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No condition</SelectItem>
                          {questions
                            .filter(q => q.id !== question.id && q.order < question.order)
                            .map(q => (
                              <SelectItem key={q.id} value={q.id}>
                                Q{q.order + 1}: {q.text.slice(0, 30)}...
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {question.conditionalQuestionId && (
                        <>
                          <Select
                            value={question.conditionalOperator || ''}
                            onValueChange={(value) => updateQuestion({ conditionalOperator: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="not_equals">Not equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                            </SelectContent>
                          </Select>

                          <Input
                            value={question.conditionalValue || ''}
                            onChange={(e) => updateQuestion({ conditionalValue: e.target.value })}
                            placeholder="Value"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}