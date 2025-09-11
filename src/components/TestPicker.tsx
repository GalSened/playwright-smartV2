import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle, Circle, Filter, X, TestTube, Clock, Tag } from 'lucide-react';
import type { Suite, TestDefinition } from '@/app/types';

interface TestPickerProps {
  onSuiteCreated: (suite: Suite) => void;
  className?: string;
}

interface TestData {
  id: string;
  filePath: string;
  testName: string;
  className?: string;
  functionName: string;
  description?: string;
  category: string;
  lineNumber?: number;
  tags: string[];
  lastStatus?: string;
  lastDuration?: number;
}

export function TestPicker({ onSuiteCreated, className }: TestPickerProps) {
  const [tests, setTests] = useState<TestData[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Suite creation
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8083/api/tests/all?limit=500');
      const data = await response.json();

      if (response.ok && data.success) {
        setTests(data.tests);
      } else {
        setError('Failed to load tests');
      }
    } catch (error) {
      console.error('Failed to load tests:', error);
      setError('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  // Filtering logic
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const matchesSearch = !searchQuery || 
        test.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.functionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.filePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (test.description && test.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = !categoryFilter || test.category === categoryFilter;
      
      const matchesTag = !tagFilter || test.tags.includes(tagFilter);

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [tests, searchQuery, categoryFilter, tagFilter]);

  // Get unique categories and tags
  const categories = useMemo(() => {
    const cats = [...new Set(tests.map(test => test.category))].filter(Boolean);
    return cats.sort();
  }, [tests]);

  const tags = useMemo(() => {
    const allTags = tests.flatMap(test => test.tags);
    const uniqueTags = [...new Set(allTags)].filter(Boolean);
    return uniqueTags.sort();
  }, [tests]);

  const handleTestToggle = (testId: string) => {
    setSelectedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTests.size === filteredTests.length) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(filteredTests.map(test => test.id)));
    }
  };

  const handleCreateSuite = async () => {
    if (!suiteName.trim()) {
      setError('Please enter a suite name');
      return;
    }

    if (selectedTests.size === 0) {
      setError('Please select at least one test');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const selectedTestIds = Array.from(selectedTests);
      
      // Create suite object
      const newSuite: Suite = {
        id: `suite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: suiteName,
        description: suiteDescription || `Custom suite with ${selectedTestIds.length} selected tests`,
        testIds: selectedTestIds,
        tags: ['custom'],
        createdAt: new Date().toISOString()
      };

      // Store in localStorage
      const existingSuites = localStorage.getItem('playwright-smart-suites');
      const suites = existingSuites ? JSON.parse(existingSuites) : [];
      suites.push(newSuite);
      localStorage.setItem('playwright-smart-suites', JSON.stringify(suites));

      onSuiteCreated(newSuite);
      
      // Reset form
      setSuiteName('');
      setSuiteDescription('');
      setSelectedTests(new Set());
      
    } catch (error) {
      console.error('Failed to create suite:', error);
      setError('Failed to create suite');
    } finally {
      setCreating(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setTagFilter('');
    setShowFilters(false);
  };

  const getTestStatusColor = (status?: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'skipped': return 'text-yellow-600';
      default: return 'text-gray-400';
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className={`p-4 border rounded-md bg-muted ${className || ''}`}>
        <div className="flex items-center justify-center">
          <Clock className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading tests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div>
        <h3 className="text-lg font-medium mb-2">Select Individual Tests</h3>
        <p className="text-sm text-muted-foreground">
          Choose specific tests to create a custom suite
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <X className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tests by name, function, or file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
              data-testid="test-search"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="button button-outline flex items-center gap-2"
            data-testid="toggle-filters"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 bg-muted rounded-md">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="select w-40"
              data-testid="category-filter"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="select w-32"
              data-testid="tag-filter"
            >
              <option value="">All Tags</option>
              {tags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <button
              onClick={clearFilters}
              className="button button-outline button-sm"
              data-testid="clear-filters"
            >
              Clear
            </button>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''} found
            {selectedTests.size > 0 && ` • ${selectedTests.size} selected`}
          </span>
          
          {filteredTests.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-primary hover:text-primary/80"
              data-testid="select-all-tests"
            >
              {selectedTests.size === filteredTests.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      {/* Test List */}
      <div className="border rounded-md max-h-96 overflow-y-auto">
        {filteredTests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">No tests found</div>
            {searchQuery || categoryFilter || tagFilter ? (
              <div className="text-xs mt-1">Try adjusting your search or filters</div>
            ) : (
              <div className="text-xs mt-1">No tests available</div>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredTests.map((test) => {
              const isSelected = selectedTests.has(test.id);
              
              return (
                <div
                  key={test.id}
                  className={`p-4 hover:bg-muted transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleTestToggle(test.id)}
                      className="mt-1"
                      data-testid={`test-checkbox-${test.id}`}
                    >
                      {isSelected ? (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground hover:text-blue-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm truncate" title={test.testName}>
                            {test.functionName}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate mt-1" title={test.filePath}>
                            {test.filePath}
                          </p>
                          {test.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {test.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground ml-4">
                          <span className="bg-muted px-2 py-1 rounded">
                            {test.category}
                          </span>
                          
                          {test.lastStatus && (
                            <div className={`flex items-center gap-1 ${getTestStatusColor(test.lastStatus)}`}>
                              <div className="w-2 h-2 rounded-full bg-current"></div>
                              {test.lastStatus}
                              {test.lastDuration && (
                                <span className="text-muted-foreground">
                                  ({formatDuration(test.lastDuration)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {test.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {test.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {test.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{test.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Suite Creation Form */}
      {selectedTests.size > 0 && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
            <CheckCircle className="h-4 w-4" />
            <span>
              <strong>{selectedTests.size}</strong> test{selectedTests.size !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Suite Name *</label>
              <input
                type="text"
                value={suiteName}
                onChange={(e) => setSuiteName(e.target.value)}
                placeholder="Enter suite name..."
                className="input"
                data-testid="custom-suite-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={suiteDescription}
                onChange={(e) => setSuiteDescription(e.target.value)}
                placeholder="Optional description..."
                className="input h-20 resize-none"
                data-testid="custom-suite-description"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateSuite}
                disabled={creating || !suiteName.trim()}
                className="button button-primary flex items-center gap-2"
                data-testid="create-custom-suite"
              >
                {creating ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                {creating ? 'Creating...' : 'Create Custom Suite'}
              </button>
              
              <button
                onClick={() => {
                  setSelectedTests(new Set());
                  setSuiteName('');
                  setSuiteDescription('');
                  setError(null);
                }}
                className="button button-outline"
                data-testid="clear-selection"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}