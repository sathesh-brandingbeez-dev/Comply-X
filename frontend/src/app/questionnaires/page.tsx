'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, BarChart3, Settings, Play, Pause, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QuestionnaireBuilder } from '@/components/questionnaires/questionnaire-builder';
import { QuestionnaireStats } from '@/components/questionnaires/questionnaire-stats';

interface Questionnaire {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'closed' | 'archived';
  created_at: string;
  questions: any[];
  responses?: number;
  completion_rate?: number;
}

export default function QuestionnairePage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);

  // Mock data for demo
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setQuestionnaires([
        {
          id: 1,
          title: "Digital Resource Satisfaction Survey",
          description: "Survey to understand student satisfaction with digital library resources",
          status: 'active',
          created_at: '2024-01-15',
          questions: [
            { id: 1, type: 'rating', text: 'Rate your satisfaction with e-books (1-5)' },
            { id: 2, type: 'multiple_choice', text: 'Preferred resource type', options: ['E-book', 'Journal', 'Video', 'Audio'] },
            { id: 3, type: 'text', text: 'Suggestions for improvement' }
          ],
          responses: 127,
          completion_rate: 85
        },
        {
          id: 2,
          title: "Library Service Feedback",
          description: "Gather feedback on overall library services and facilities",
          status: 'draft',
          created_at: '2024-01-10',
          questions: [
            { id: 1, type: 'yes_no', text: 'Are you satisfied with current library hours?' },
            { id: 2, type: 'rating', text: 'Rate the helpfulness of library staff (1-10)' }
          ],
          responses: 0,
          completion_rate: 0
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredQuestionnaires = questionnaires.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'archived': return <Archive className="h-3 w-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Questionnaire Builder</h1>
          <p className="text-gray-600">Create and manage surveys, feedback forms, and questionnaires</p>
        </div>
        <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedQuestionnaire(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Questionnaire
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedQuestionnaire ? 'Edit Questionnaire' : 'Create New Questionnaire'}
              </DialogTitle>
            </DialogHeader>
            <QuestionnaireBuilder 
              questionnaire={selectedQuestionnaire}
              onSave={() => setIsBuilderOpen(false)}
              onCancel={() => setIsBuilderOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <QuestionnaireStats questionnaires={questionnaires} />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search questionnaires..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Questionnaires Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuestionnaires.map((questionnaire) => (
          <Card key={questionnaire.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{questionnaire.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{questionnaire.description}</p>
                </div>
                <Badge className={`${getStatusColor(questionnaire.status)} flex items-center gap-1`}>
                  {getStatusIcon(questionnaire.status)}
                  {questionnaire.status.charAt(0).toUpperCase() + questionnaire.status.slice(1)}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Questions</p>
                  <p className="font-semibold">{questionnaire.questions.length}</p>
                </div>
                <div>
                  <p className="text-gray-500">Responses</p>
                  <p className="font-semibold">{questionnaire.responses || 0}</p>
                </div>
              </div>

              {/* Completion Rate */}
              {questionnaire.completion_rate !== undefined && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Completion Rate</span>
                    <span className="font-semibold">{questionnaire.completion_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${questionnaire.completion_rate}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedQuestionnaire(questionnaire);
                    setIsBuilderOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Analytics
                </Button>
              </div>

              {/* Created Date */}
              <p className="text-xs text-gray-400">
                Created {new Date(questionnaire.created_at).toLocaleDateString()}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredQuestionnaires.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No questionnaires found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first questionnaire to get started'
                }
              </p>
            </div>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setIsBuilderOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Questionnaire
              </Button>
            )}
          </div>
        </Card>
      )}
      </div>
    </DashboardLayout>
  );
}