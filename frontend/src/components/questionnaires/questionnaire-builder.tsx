'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Copy, Eye, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QuestionEditor } from './question-editor';

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

interface QuestionnaireBuilderProps {
  questionnaire?: any;
  onSave: () => void;
  onCancel: () => void;
}

export function QuestionnaireBuilder({ questionnaire, onSave, onCancel }: QuestionnaireBuilderProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState({
    allowAnonymous: false,
    allowMultipleResponses: false,
    showProgress: true,
    randomizeQuestions: false,
    accessLevel: 'internal' as 'public' | 'internal' | 'confidential' | 'restricted',
    startsAt: '',
    endsAt: '',
    targetRoles: [] as string[],
    targetDepartments: [] as number[]
  });
  const [activeTab, setActiveTab] = useState<'design' | 'settings' | 'preview'>('design');

  // Load existing questionnaire data
  useEffect(() => {
    if (questionnaire) {
      setTitle(questionnaire.title || '');
      setDescription(questionnaire.description || '');
      setQuestions(questionnaire.questions?.map((q: any, index: number) => ({
        id: q.id?.toString() || `q_${Date.now()}_${index}`,
        type: q.question_type || q.type,
        text: q.question_text || q.text,
        required: q.is_required || q.required || false,
        order: q.order_index || q.order || index,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        minValue: q.min_value || q.minValue,
        maxValue: q.max_value || q.maxValue,
        placeholder: q.placeholder,
        helpText: q.help_text || q.helpText,
        conditionalQuestionId: q.conditional_question_id || q.conditionalQuestionId,
        conditionalOperator: q.conditional_operator || q.conditionalOperator,
        conditionalValue: q.conditional_value || q.conditionalValue,
        showIfConditionMet: q.show_if_condition_met ?? q.showIfConditionMet ?? true
      })) || []);
      
      setSettings({
        allowAnonymous: questionnaire.allow_anonymous || false,
        allowMultipleResponses: questionnaire.allow_multiple_responses || false,
        showProgress: questionnaire.show_progress ?? true,
        randomizeQuestions: questionnaire.randomize_questions || false,
        accessLevel: questionnaire.access_level || 'internal',
        startsAt: questionnaire.starts_at ? new Date(questionnaire.starts_at).toISOString().slice(0, 16) : '',
        endsAt: questionnaire.ends_at ? new Date(questionnaire.ends_at).toISOString().slice(0, 16) : '',
        targetRoles: questionnaire.target_roles || [],
        targetDepartments: questionnaire.target_departments || []
      });
    }
  }, [questionnaire]);

  const addQuestion = (type: Question['type'] = 'text') => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type,
      text: '',
      required: false,
      order: questions.length,
      ...(type === 'multiple_choice' || type === 'single_choice' ? { options: ['Option 1', 'Option 2'] } : {}),
      ...(type === 'rating' ? { minValue: 1, maxValue: 5 } : {}),
      ...(type === 'number' ? { minValue: 0, maxValue: 100 } : {})
    };

    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id).map((q, index) => ({ ...q, order: index })));
  };

  const duplicateQuestion = (id: string) => {
    const question = questions.find(q => q.id === id);
    if (question) {
      const newQuestion = {
        ...question,
        id: `q_${Date.now()}`,
        text: `${question.text} (Copy)`,
        order: questions.length
      };
      setQuestions([...questions, newQuestion]);
    }
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, removed);
    
    // Update order
    const updatedQuestions = newQuestions.map((q, index) => ({ ...q, order: index }));
    setQuestions(updatedQuestions);
  };

  const handleSave = () => {
    // Here you would typically make an API call
    console.log('Saving questionnaire:', {
      title,
      description,
      questions,
      settings
    });
    onSave();
  };

  const canSave = title.trim() !== '' && questions.length > 0;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b">
        <button
          className={`pb-2 px-1 border-b-2 ${activeTab === 'design' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('design')}
        >
          Design
        </button>
        <button
          className={`pb-2 px-1 border-b-2 ${activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`pb-2 px-1 border-b-2 ${activeTab === 'preview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      {/* Design Tab */}
      {activeTab === 'design' && (
        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Questionnaire Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter questionnaire title"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this questionnaire"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Questions ({questions.length})</h3>
              <Select onValueChange={(value) => addQuestion(value as Question['type'])}>
                <SelectTrigger className="w-auto bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
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

            {questions.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">No questions yet</h3>
                    <p className="text-gray-600">Add your first question to get started</p>
                  </div>
                  <Button onClick={() => addQuestion()}>Add Question</Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <QuestionEditor
                    key={question.id}
                    question={question}
                    index={index}
                    questions={questions}
                    onUpdate={updateQuestion}
                    onDelete={deleteQuestion}
                    onDuplicate={duplicateQuestion}
                    onMove={moveQuestion}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Response Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Anonymous Responses</Label>
                  <p className="text-sm text-gray-600">Users can respond without logging in</p>
                </div>
                <Switch
                  checked={settings.allowAnonymous}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowAnonymous: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Multiple Responses</Label>
                  <p className="text-sm text-gray-600">Users can submit multiple responses</p>
                </div>
                <Switch
                  checked={settings.allowMultipleResponses}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowMultipleResponses: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Progress Bar</Label>
                  <p className="text-sm text-gray-600">Display completion progress to users</p>
                </div>
                <Switch
                  checked={settings.showProgress}
                  onCheckedChange={(checked) => setSettings({ ...settings, showProgress: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Randomize Questions</Label>
                  <p className="text-sm text-gray-600">Display questions in random order</p>
                </div>
                <Switch
                  checked={settings.randomizeQuestions}
                  onCheckedChange={(checked) => setSettings({ ...settings, randomizeQuestions: checked })}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Access Control</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="access-level">Access Level</Label>
                <Select value={settings.accessLevel} onValueChange={(value) => setSettings({ ...settings, accessLevel: value as any })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Schedule</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="starts-at">Start Date & Time</Label>
                <Input
                  id="starts-at"
                  type="datetime-local"
                  value={settings.startsAt}
                  onChange={(e) => setSettings({ ...settings, startsAt: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ends-at">End Date & Time</Label>
                <Input
                  id="ends-at"
                  type="datetime-local"
                  value={settings.endsAt}
                  onChange={(e) => setSettings({ ...settings, endsAt: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{title || 'Untitled Questionnaire'}</h2>
                {description && <p className="text-gray-600 mt-2">{description}</p>}
              </div>

              {settings.showProgress && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>0 / {questions.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-6">
                {questions.map((question, index) => (
                  <div key={question.id} className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="text-sm text-gray-500 mt-1">{index + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Label className="font-medium">{question.text || 'Question text'}</Label>
                          {question.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                        </div>
                        {question.helpText && (
                          <p className="text-sm text-gray-600 mt-1">{question.helpText}</p>
                        )}

                        <div className="mt-3">
                          {question.type === 'text' && (
                            <Input placeholder={question.placeholder || 'Your answer'} disabled />
                          )}
                          {question.type === 'textarea' && (
                            <Textarea placeholder={question.placeholder || 'Your answer'} disabled rows={3} />
                          )}
                          {(question.type === 'multiple_choice' || question.type === 'single_choice') && (
                            <div className="space-y-2">
                              {question.options?.map((option, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <input
                                    type={question.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                    disabled
                                    className="rounded"
                                  />
                                  <span className="text-sm">{option}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {question.type === 'rating' && (
                            <div className="flex space-x-2">
                              {Array.from({ length: (question.maxValue || 5) - (question.minValue || 1) + 1 }, (_, i) => (
                                <button key={i} className="w-8 h-8 border rounded text-sm" disabled>
                                  {(question.minValue || 1) + i}
                                </button>
                              ))}
                            </div>
                          )}
                          {question.type === 'yes_no' && (
                            <div className="flex space-x-4">
                              <label className="flex items-center space-x-2">
                                <input type="radio" disabled />
                                <span>Yes</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="radio" disabled />
                                <span>No</span>
                              </label>
                            </div>
                          )}
                          {question.type === 'number' && (
                            <Input
                              type="number"
                              min={question.minValue}
                              max={question.maxValue}
                              placeholder={question.placeholder || 'Enter number'}
                              disabled
                            />
                          )}
                          {question.type === 'email' && (
                            <Input
                              type="email"
                              placeholder={question.placeholder || 'Enter email address'}
                              disabled
                            />
                          )}
                          {question.type === 'date' && (
                            <Input type="date" disabled />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="space-x-2">
          <Button variant="outline" disabled={!canSave}>
            Save as Draft
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {questionnaire ? 'Update' : 'Create'} Questionnaire
          </Button>
        </div>
      </div>
    </div>
  );
}