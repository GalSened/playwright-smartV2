import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { SuiteSelector } from '@/components/SuiteSelector';
import { QuickSuiteBuilder } from '@/components/QuickSuiteBuilder';
import { TestPicker } from '@/components/TestPicker';
import { 
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit3,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Globe,
  Package,
  Zap,
  TestTube,
  Info,
  Settings,
  AlertTriangle,
  RotateCcw as Repeat
} from 'lucide-react';
import { schedulerApi } from '@/services/schedulerApi';
import {
  Schedule,
  ScheduleFormData,
  CreateScheduleRequest,
  ScheduleListResponse
} from '@/types/scheduler';
import type { Suite } from '@/app/types';

type SuiteSelectionMode = 'preselected' | 'existing' | 'quick' | 'custom';

interface TestRunSchedulerProps {
  selectedSuite?: {
    id: string;
    name: string;
    testIds: string[];
  };
  onScheduleCreated?: (schedule: Schedule) => void;
}

export function TestRunScheduler({ selectedSuite, onScheduleCreated }: TestRunSchedulerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());

  // Hybrid mode state
  const [suiteSelectionMode, setSuiteSelectionMode] = useState<SuiteSelectionMode>(
    selectedSuite ? 'preselected' : 'existing'
  );
  const [selectedSuiteForScheduler, setSelectedSuiteForScheduler] = useState<Suite | null>(
    selectedSuite ? {
      id: selectedSuite.id,
      name: selectedSuite.name,
      testIds: selectedSuite.testIds,
      tags: [],
      createdAt: new Date().toISOString(),
      description: ''
    } : null
  );
  const [showSuiteSelection, setShowSuiteSelection] = useState(!selectedSuite);

  // Form state
  const [formData, setFormData] = useState<ScheduleFormData>({
    suite_id: selectedSuiteForScheduler?.id || '',
    suite_name: selectedSuiteForScheduler?.name || '',
    date: '',
    time: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notes: '',
    priority: 5,
    run_now: false,
    recurring: false,
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_days: [] as string[],
    execution_options: {
      mode: 'headless',
      execution: 'parallel',
      retries: 1,
      browser: 'chromium',
      environment: 'staging'
    }
  });

  // Load schedules on mount
  useEffect(() => {
    loadSchedules();
    loadStats();
    
    // Set up polling for live updates
    const interval = setInterval(() => {
      loadSchedules();
      loadStats();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Update form when selected suite changes
  useEffect(() => {
    if (selectedSuite) {
      setFormData(prev => ({
        ...prev,
        suite_id: selectedSuite.id,
        suite_name: selectedSuite.name
      }));
    }
  }, [selectedSuite]);

  const loadSchedules = async () => {
    try {
      const response = await schedulerApi.getSchedules({
        limit: 50,
        offset: 0
      });
      setSchedules(response.schedules);
    } catch (err) {
      console.error('Failed to load schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await schedulerApi.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.time || !formData.suite_id) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate datetime is in the future
    if (!isDateTimeValid) {
      setError('Schedule time must be at least 1 minute in the future');
      return;
    }

    // Validate recurring schedule requirements
    if (formData.recurring) {
      if (formData.recurrence_type === 'weekly' && formData.recurrence_days.length === 0) {
        setError('Please select at least one day for weekly recurring schedules');
        return;
      }
      
      if (formData.recurrence_type === 'custom' && (!formData.recurrence_interval || formData.recurrence_interval < 1)) {
        setError('Please enter a valid interval for custom recurring schedules');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Combine date and time into ISO string
      const runAt = `${formData.date}T${formData.time}:00.000`;

      const request: CreateScheduleRequest = {
        suite_id: formData.suite_id,
        suite_name: formData.suite_name,
        run_at: runAt,
        timezone: formData.timezone,
        notes: formData.notes || undefined,
        priority: formData.priority,
        execution_options: formData.execution_options,
        run_now: formData.run_now,
        recurrence_type: formData.recurring ? formData.recurrence_type : undefined,
        recurrence_interval: formData.recurring && formData.recurrence_type === 'custom' ? formData.recurrence_interval : undefined,
        recurrence_days: formData.recurring && formData.recurrence_type === 'weekly' ? formData.recurrence_days : undefined
      };

      const response = await schedulerApi.createSchedule(request);
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        date: '',
        time: '',
        notes: '',
        run_now: false,
        recurring: false,
        recurrence_type: 'none',
        recurrence_interval: 1,
        recurrence_days: [] as string[]
      }));
      
      setShowForm(false);
      await loadSchedules();
      await loadStats();

      if (onScheduleCreated) {
        onScheduleCreated(response.schedule);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleRunNow = async (schedule: Schedule) => {
    try {
      await schedulerApi.runNow(schedule.id, {
        notes: 'Manual execution triggered'
      });
      await loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run schedule');
    }
  };

  const handleCancel = async (schedule: Schedule) => {
    try {
      await schedulerApi.cancelSchedule(schedule.id);
      await loadSchedules();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel schedule');
    }
  };

  const handleDelete = async (schedule: Schedule) => {
    if (!confirm(`Are you sure you want to delete the schedule for "${schedule.suite_name}"?`)) {
      return;
    }

    try {
      await schedulerApi.deleteSchedule(schedule.id);
      await loadSchedules();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  // Hybrid mode handlers
  const handleSuiteSelection = (suite: Suite | null) => {
    setSelectedSuiteForScheduler(suite);
    if (suite) {
      setFormData(prev => ({
        ...prev,
        suite_id: suite.id,
        suite_name: suite.name
      }));
      setShowSuiteSelection(false);
    }
  };

  const handleSuiteCreated = (suite: Suite) => {
    setSelectedSuiteForScheduler(suite);
    setFormData(prev => ({
      ...prev,
      suite_id: suite.id,
      suite_name: suite.name
    }));
    setShowSuiteSelection(false);
    // Automatically show the scheduling form once suite is selected
    setShowForm(true);
  };

  const handleSuiteModeChange = (mode: SuiteSelectionMode) => {
    setSuiteSelectionMode(mode);
    setShowSuiteSelection(true);
    // Clear current selection when changing modes
    if (mode !== 'preselected') {
      setSelectedSuiteForScheduler(null);
      setFormData(prev => ({
        ...prev,
        suite_id: '',
        suite_name: ''
      }));
    }
  };

  const handleBulkAction = async (action: 'cancel' | 'delete') => {
    if (selectedSchedules.size === 0) return;

    try {
      setIsLoading(true);
      const selectedIds = Array.from(selectedSchedules);
      
      if (action === 'cancel') {
        // Cancel selected schedules
        const promises = selectedIds.map(id => 
          schedulerApi.cancelSchedule(id)
        );
        await Promise.all(promises);
        toast.success(`Successfully cancelled ${selectedIds.length} schedule(s)`);
      } else if (action === 'delete') {
        // Delete selected schedules
        const promises = selectedIds.map(id => 
          schedulerApi.deleteSchedule(id)
        );
        await Promise.all(promises);
        toast.success(`Successfully deleted ${selectedIds.length} schedule(s)`);
      }
      
      // Clear selection and refresh data
      setSelectedSchedules(new Set());
      await fetchSchedules();
      
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
      toast.error(`Failed to ${action} selected schedules. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleScheduleSelection = (scheduleId: string) => {
    setSelectedSchedules(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(scheduleId)) {
        newSelection.delete(scheduleId);
      } else {
        newSelection.add(scheduleId);
      }
      return newSelection;
    });
  };

  // Get minimum date/time (now + 1 minute)
  const minDateTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5)
    };
  }, []);

  // Validate if selected datetime is in the future
  const isDateTimeValid = useMemo(() => {
    if (!formData.date || !formData.time) return true; // Don't show error until both are filled
    
    const selectedDateTime = new Date(`${formData.date}T${formData.time}:00.000`);
    const minDate = new Date();
    minDate.setMinutes(minDate.getMinutes() + 1);
    
    return selectedDateTime >= minDate;
  }, [formData.date, formData.time]);

  // Get smart time suggestions
  const getSmartTimeSuggestions = () => {
    const now = new Date();
    const suggestions = [];
    
    // Add common maintenance window times
    const maintenanceTimes = ['01:00', '02:00', '03:00', '04:00', '05:00'];
    
    // Add next hour and following hours if current time allows
    for (let i = 1; i <= 3; i++) {
      const futureTime = new Date(now);
      futureTime.setHours(futureTime.getHours() + i, 0, 0, 0);
      const timeString = futureTime.toTimeString().slice(0, 5);
      if (!suggestions.includes(timeString)) {
        suggestions.push(timeString);
      }
    }
    
    // Add maintenance times if not already included
    maintenanceTimes.forEach(time => {
      if (!suggestions.includes(time)) {
        suggestions.push(time);
      }
    });
    
    return suggestions.slice(0, 4); // Return max 4 suggestions
  };

  const getStatusIcon = (status: Schedule['status']) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'running':
        return <Play className="h-4 w-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'canceled':
        return <Pause className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Schedule['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'running':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (utcDateTime: string, timezone: string = 'Asia/Jerusalem') => {
    const date = new Date(utcDateTime);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  const getTimeUntilRun = (schedule: Schedule) => {
    if (schedule.status !== 'scheduled' || !schedule.minutes_until_run) {
      return null;
    }

    const minutes = schedule.minutes_until_run;
    if (minutes < 0) {
      return <span className="text-red-600 text-sm font-medium">Overdue</span>;
    }

    if (minutes < 60) {
      return <span className="text-orange-600 text-sm font-medium">{minutes}m</span>;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return <span className="text-blue-600 text-sm font-medium">{hours}h {minutes % 60}m</span>;
    }

    const days = Math.floor(hours / 24);
    return <span className="text-gray-600 text-sm font-medium">{days}d {hours % 24}h</span>;
  };

  const getRecurrenceDescription = (schedule: Schedule) => {
    if (!schedule.recurrence_type || schedule.recurrence_type === 'none') {
      return null;
    }

    const time = schedule.run_at_local ? new Date(schedule.run_at_local).toTimeString().slice(0, 5) : 'scheduled time';
    
    switch (schedule.recurrence_type) {
      case 'daily':
        return `🔄 Runs daily at ${time}`;
      
      case 'weekly':
        if (schedule.recurrence_days_parsed && schedule.recurrence_days_parsed.length > 0) {
          const days = schedule.recurrence_days_parsed.join(', ');
          return `🔄 Runs weekly on ${days} at ${time}`;
        }
        return `🔄 Runs weekly at ${time}`;
      
      case 'monthly':
        const dayOfMonth = schedule.run_at_local ? new Date(schedule.run_at_local).getDate() : 'selected day';
        return `🔄 Runs monthly on day ${dayOfMonth} at ${time}`;
      
      case 'custom':
        const interval = schedule.recurrence_interval || 1;
        return `🔄 Runs every ${interval} days at ${time}`;
      
      default:
        return `🔄 Recurring schedule`;
    }
  };


  return (
    <div className="space-y-6" data-testid="test-run-scheduler">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Schedules</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.by_status.scheduled || 0}</div>
                  <div className="text-xs text-muted-foreground">Scheduled</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.next_24h}</div>
                  <div className="text-xs text-muted-foreground">Next 24h</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.overdue}</div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}



      {/* Suite Selection Section */}
      {showSuiteSelection && (
        <Card data-testid="suite-selection-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Choose Test Suite
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select how you want to choose tests for scheduling
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Suite Selection Mode Tabs */}
            <div className="flex space-x-1 border-b">
              {[
                { key: 'existing', label: 'Existing Suites', icon: Package, desc: 'Choose from saved suites' },
                { key: 'quick', label: 'Quick Builder', icon: Zap, desc: 'Create from tags/categories' },
                { key: 'custom', label: 'Custom Selection', icon: TestTube, desc: 'Pick individual tests' }
              ].map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => handleSuiteModeChange(key as SuiteSelectionMode)}
                  className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                    suiteSelectionMode === key
                      ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`${key}-suite-mode`}
                >
                  <Icon className="h-4 w-4" />
                  <div className="text-left">
                    <div>{label}</div>
                    <div className="text-xs opacity-75">{desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Suite Selection Content */}
            <div className="min-h-64">
              {suiteSelectionMode === 'existing' && (
                <SuiteSelector
                  selectedSuite={selectedSuiteForScheduler}
                  onSuiteSelect={handleSuiteSelection}
                  className="w-full"
                />
              )}

              {suiteSelectionMode === 'quick' && (
                <QuickSuiteBuilder
                  onSuiteCreated={handleSuiteCreated}
                  className="w-full"
                />
              )}

              {suiteSelectionMode === 'custom' && (
                <TestPicker
                  onSuiteCreated={handleSuiteCreated}
                  className="w-full"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Guidance Panels */}
      {suiteSelectionMode === 'preselected' && !selectedSuiteForScheduler && (
        <Card data-testid="guidance-panel" className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-500 rounded-full">
                <Info className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-2 text-lg">Ready to Schedule Tests?</h3>
                <p className="text-sm text-blue-700 mb-4 leading-relaxed">
                  To use the scheduler, you need to select tests first. Choose your preferred method:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                    <div className="p-1 bg-blue-100 rounded">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-900">Use Test Bank</div>
                      <div className="text-xs text-blue-600">Go to Tests & Suites tab</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                    <div className="p-1 bg-blue-100 rounded">
                      <Zap className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-900">Quick Selection</div>
                      <div className="text-xs text-blue-600">Use suite builders below</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuiteSelection(true)}
                  className="button button-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                  data-testid="show-suite-selection"
                >
                  <Settings className="h-4 w-4" />
                  Choose Test Suite
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Feedback Panel */}
      {selectedSuiteForScheduler && !showForm && (
        <Card data-testid="success-panel" className="border-green-200 bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-full">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-green-900">Suite Selected Successfully!</h4>
                <p className="text-sm text-green-700">
                  <strong>{selectedSuiteForScheduler.name}</strong> with {selectedSuiteForScheduler.testIds.length} tests is ready to schedule.
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="button button-success flex items-center gap-2 px-4 py-2"
                data-testid="quick-schedule"
              >
                <Calendar className="h-4 w-4" />
                Schedule Now
              </button>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Schedule Form */}
      <Card data-testid="schedule-form-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule Test Run</CardTitle>
            {!showForm && selectedSuiteForScheduler && (
              <button
                onClick={() => setShowForm(true)}
                className="button button-primary flex items-center gap-2"
                data-testid="show-schedule-form"
              >
                <Calendar className="h-4 w-4" />
                Schedule Run
              </button>
            )}
          </div>
          
          {selectedSuiteForScheduler && (
            <div className="text-sm text-muted-foreground">
              Suite: <strong>{selectedSuiteForScheduler.name}</strong> ({selectedSuiteForScheduler.testIds.length} tests)
              <button
                onClick={() => setShowSuiteSelection(true)}
                className="ml-2 text-primary hover:text-primary/80 underline"
                data-testid="change-suite"
              >
                Change
              </button>
            </div>
          )}
        </CardHeader>

        {showForm && selectedSuiteForScheduler && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Suite Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">Test Suite</label>
                <input
                  type="text"
                  value={selectedSuiteForScheduler?.name || ''}
                  disabled
                  className="input bg-muted"
                  data-testid="schedule-suite-name"
                />
                {!selectedSuiteForScheduler && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Please select a test suite from the Test Bank to schedule
                  </p>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {formData.recurring ? 'Start Date' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    min={minDateTime.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className={`input ${!isDateTimeValid && formData.date && formData.time ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    required
                    data-testid="schedule-date"
                  />
                  {formData.recurring && (
                    <p className="text-xs text-muted-foreground mt-1">
                      First run date for recurring schedule
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className={`input ${!isDateTimeValid && formData.date && formData.time ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    required
                    data-testid="schedule-time"
                  />
                  {formData.recurring && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Time for all recurring runs
                    </p>
                  )}
                </div>
              </div>

              {/* Date/Time Validation Feedback */}
              {!isDateTimeValid && formData.date && formData.time && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">
                    Schedule time must be at least 1 minute in the future
                  </span>
                </div>
              )}

              {/* Smart Time Suggestions */}
              {!formData.time && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">🕒 Suggested Times</p>
                  <div className="flex flex-wrap gap-2">
                    {getSmartTimeSuggestions().map((time, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, time }))}
                        className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
                        data-testid={`time-suggestion-${time}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  className="select"
                  data-testid="schedule-timezone"
                >
                  <option value="Asia/Jerusalem">Asia/Jerusalem (IST/IDT)</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                </select>
              </div>

              {/* Recurring Schedule Options */}
              <div className="border-2 border-dashed border-blue-200 rounded-lg p-4 bg-blue-50/30">
                <div className="flex items-center gap-2 mb-3">
                  <Repeat className="h-4 w-4 text-blue-600" />
                  <label className="text-sm font-medium text-blue-900">Recurring Schedule</label>
                </div>
                
                <div className="space-y-4">
                  {/* Enable Recurring */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={formData.recurring}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        recurring: e.target.checked,
                        recurrence_type: e.target.checked ? 'daily' : 'none'
                      }))}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      data-testid="schedule-recurring"
                    />
                    <label htmlFor="recurring" className="text-sm text-blue-800">
                      Make this a recurring schedule
                    </label>
                  </div>

                  {/* Recurring Options */}
                  {formData.recurring && (
                    <div className="space-y-3 pl-6 border-l-2 border-blue-200">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">Recurrence Type</label>
                        <select
                          value={formData.recurrence_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurrence_type: e.target.value }))}
                          className="select"
                          data-testid="schedule-recurrence-type"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="custom">Custom Interval</option>
                        </select>
                      </div>

                      {/* Custom Interval */}
                      {formData.recurrence_type === 'custom' && (
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-1">Interval (days)</label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={formData.recurrence_interval}
                            onChange={(e) => setFormData(prev => ({ ...prev, recurrence_interval: parseInt(e.target.value) }))}
                            className="input w-24"
                            data-testid="schedule-recurrence-interval"
                          />
                          <span className="text-sm text-muted-foreground ml-2">days</span>
                        </div>
                      )}

                      {/* Weekly Days Selection */}
                      {formData.recurrence_type === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-2">Days of Week</label>
                          <div className="flex flex-wrap gap-2">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                              <label key={day} className="flex items-center space-x-1">
                                <input
                                  type="checkbox"
                                  checked={formData.recurrence_days.includes(day)}
                                  onChange={(e) => {
                                    const days = e.target.checked
                                      ? [...formData.recurrence_days, day]
                                      : formData.recurrence_days.filter(d => d !== day);
                                    setFormData(prev => ({ ...prev, recurrence_days: days }));
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                  data-testid={`schedule-day-${day.toLowerCase()}`}
                                />
                                <span className="text-sm">{day.slice(0, 3)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick Presets */}
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm font-medium text-blue-900 mb-2">Quick Presets</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              recurring: true,
                              recurrence_type: 'daily',
                              time: '03:00'
                            }))}
                            className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200"
                            data-testid="preset-daily-3am"
                          >
                            Daily at 3:00 AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              recurring: true,
                              recurrence_type: 'weekly',
                              recurrence_days: ['Sunday'],
                              time: '02:00'
                            }))}
                            className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full hover:bg-green-200"
                            data-testid="preset-weekly-sunday"
                          >
                            Weekly Sunday 2:00 AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              recurring: true,
                              recurrence_type: 'weekly',
                              recurrence_days: ['Monday', 'Wednesday', 'Friday'],
                              time: '01:00'
                            }))}
                            className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full hover:bg-purple-200"
                            data-testid="preset-weekdays"
                          >
                            Mon/Wed/Fri 1:00 AM
                          </button>
                        </div>
                      </div>

                      {/* Schedule Preview */}
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-1">Schedule Preview:</p>
                        <p className="text-sm text-blue-700">
                          {formData.recurrence_type === 'daily' && `Every day at ${formData.time || 'selected time'}`}
                          {formData.recurrence_type === 'weekly' && formData.recurrence_days.length > 0 && 
                            `Every ${formData.recurrence_days.join(', ')} at ${formData.time || 'selected time'}`}
                          {formData.recurrence_type === 'weekly' && formData.recurrence_days.length === 0 && 
                            'Select days of the week'}
                          {formData.recurrence_type === 'monthly' && `Monthly on day ${new Date().getDate()} at ${formData.time || 'selected time'}`}
                          {formData.recurrence_type === 'custom' && `Every ${formData.recurrence_interval} days at ${formData.time || 'selected time'}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Browser</label>
                  <select
                    value={formData.execution_options.browser}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      execution_options: {
                        ...prev.execution_options,
                        browser: e.target.value as any
                      }
                    }))}
                    className="select"
                    data-testid="schedule-browser"
                  >
                    <option value="chromium">Chromium</option>
                    <option value="firefox">Firefox</option>
                    <option value="webkit">WebKit</option>
                    <option value="all">All Browsers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mode</label>
                  <select
                    value={formData.execution_options.mode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      execution_options: {
                        ...prev.execution_options,
                        mode: e.target.value as any
                      }
                    }))}
                    className="select"
                    data-testid="schedule-mode"
                  >
                    <option value="headless">Headless</option>
                    <option value="headed">Headed</option>
                  </select>
                </div>
              </div>

              {/* Priority and Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    className="input"
                    data-testid="schedule-priority"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Retries</label>
                  <select
                    value={formData.execution_options.retries}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      execution_options: {
                        ...prev.execution_options,
                        retries: parseInt(e.target.value)
                      }
                    }))}
                    className="select"
                    data-testid="schedule-retries"
                  >
                    <option value="0">No retries</option>
                    <option value="1">1 retry</option>
                    <option value="2">2 retries</option>
                    <option value="3">3 retries</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input h-20 resize-none"
                  placeholder="Optional notes for this scheduled run..."
                  data-testid="schedule-notes"
                />
              </div>

              {/* Run Now Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="run-now"
                  checked={formData.run_now}
                  onChange={(e) => setFormData(prev => ({ ...prev, run_now: e.target.checked }))}
                  className="rounded"
                  data-testid="schedule-run-now"
                />
                <label htmlFor="run-now" className="text-sm">
                  {formData.recurring 
                    ? 'Also run immediately (before recurring schedule starts)' 
                    : 'Also run immediately (in addition to scheduled time)'
                  }
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                  className="button button-outline"
                  data-testid="cancel-schedule"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedSuiteForScheduler || !isDateTimeValid || (formData.recurring && formData.recurrence_type === 'weekly' && formData.recurrence_days.length === 0)}
                  className="button button-primary flex items-center gap-2"
                  data-testid="create-schedule"
                >
                  {loading && <Loading size="sm" />}
                  {formData.run_now ? 'Schedule & Run' : 'Schedule Run'}
                </button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Scheduled Runs List */}
      <Card data-testid="scheduled-runs-list">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Scheduled Runs
              {selectedSchedules.size > 0 && (
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {selectedSchedules.size} selected
                </span>
              )}
            </CardTitle>
            
            {/* Bulk Actions */}
            {selectedSchedules.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('cancel')}
                  className="button button-outline px-3 py-2 text-sm flex items-center gap-2"
                  data-testid="bulk-cancel"
                  disabled={!Array.from(selectedSchedules).some(id => 
                    schedules.find(s => s.id === id)?.status === 'scheduled'
                  )}
                >
                  <Pause className="h-4 w-4" />
                  Cancel Selected
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="button button-outline text-red-600 hover:bg-red-50 px-3 py-2 text-sm flex items-center gap-2"
                  data-testid="bulk-delete"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedSchedules(new Set())}
                  className="button button-outline px-3 py-2 text-sm"
                  data-testid="clear-selection"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
          
          {/* Selection Controls */}
          {schedules.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button
                  onClick={() => setSelectedSchedules(new Set(schedules.map(s => s.id)))}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  data-testid="select-all"
                >
                  Select All ({schedules.length})
                </button>
                <button
                  onClick={() => setSelectedSchedules(new Set())}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                  data-testid="select-none"
                >
                  Select None
                </button>
                <button
                  onClick={() => {
                    const scheduled = schedules.filter(s => s.status === 'scheduled').map(s => s.id);
                    setSelectedSchedules(new Set(scheduled));
                  }}
                  className="text-orange-600 hover:text-orange-800 text-sm"
                  data-testid="select-scheduled"
                >
                  Select Scheduled Only
                </button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No scheduled runs"
              description="Schedule your first test run using the form above"
            />
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border rounded-lg p-4 space-y-3"
                  data-testid="schedule-item"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedSchedules.has(schedule.id)}
                        onChange={() => toggleScheduleSelection(schedule.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        data-testid="schedule-checkbox"
                      />
                      {getStatusIcon(schedule.status)}
                      <div>
                        <h4 className="font-medium" data-testid="schedule-suite-name">
                          {schedule.suite_name}
                          {schedule.recurrence_type && schedule.recurrence_type !== 'none' && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <Repeat className="h-3 w-3 mr-1" />
                              {schedule.recurrence_type}
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span data-testid="schedule-datetime">
                            📅 {formatDateTime(schedule.run_at_utc, schedule.timezone)}
                          </span>
                          <span data-testid="schedule-timezone-display">
                            🌍 {schedule.timezone}
                          </span>
                          {getTimeUntilRun(schedule)}
                        </div>
                        {schedule.recurrence_type && schedule.recurrence_type !== 'none' && (
                          <div className="text-xs text-purple-600 mt-1">
                            {getRecurrenceDescription(schedule)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                        {schedule.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Priority: {schedule.priority}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {schedule.notes && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      💬 {schedule.notes}
                    </div>
                  )}

                  {/* Last Run Results */}
                  {schedule.last_run && (
                    <div className="flex items-center space-x-4 text-sm">
                      <span>Last run:</span>
                      <span className={schedule.last_run.status === 'completed' ? 'text-green-600' : 'text-red-600'}>
                        {schedule.last_run.status}
                      </span>
                      {schedule.last_run.tests_total > 0 && (
                        <span>
                          ✅ {schedule.last_run.tests_passed}/{schedule.last_run.tests_total} passed
                        </span>
                      )}
                      {schedule.last_run.duration_ms && (
                        <span>
                          ⏱️ {Math.round(schedule.last_run.duration_ms / 1000)}s
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(schedule.created_at).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {schedule.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleRunNow(schedule)}
                            className="button button-outline button-sm flex items-center gap-1"
                            data-testid="run-now-button"
                            title="Run now"
                          >
                            <Play className="h-3 w-3" />
                            Run Now
                          </button>
                          <button
                            onClick={() => handleCancel(schedule)}
                            className="button button-outline button-sm flex items-center gap-1"
                            data-testid="cancel-button"
                            title="Cancel"
                          >
                            <Pause className="h-3 w-3" />
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(schedule)}
                        className="button button-outline button-sm text-red-600 hover:bg-red-50 flex items-center gap-1"
                        data-testid="delete-button"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}