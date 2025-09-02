import React, { useState, useEffect } from 'react';
import { Plus, Tag, Folder, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { Suite } from '@/app/types';

interface QuickSuiteBuilderProps {
  onSuiteCreated: (suite: Suite) => void;
  className?: string;
}

interface Category {
  name: string;
  testCount: number;
}

interface TagInfo {
  name: string;
  testCount: number;
}

interface PresetSuite {
  name: string;
  description: string;
  tags: string[];
  categories: string[];
}

const PRESET_SUITES: PresetSuite[] = [
  {
    name: 'Smoke Test Suite',
    description: 'Critical functionality tests for quick validation',
    tags: ['smoke'],
    categories: []
  },
  {
    name: 'Regression Suite',
    description: 'Comprehensive testing across all modules',
    tags: ['regression'],
    categories: []
  },
  {
    name: 'Authentication Suite',
    description: 'Complete authentication and login tests',
    tags: ['auth', 'login'],
    categories: ['auth']
  },
  {
    name: 'Dashboard Suite',
    description: 'All dashboard functionality tests',
    tags: ['dashboard'],
    categories: ['dashboard']
  },
  {
    name: 'Performance Suite',
    description: 'Performance and load testing',
    tags: ['performance', 'slow'],
    categories: []
  },
  {
    name: 'Critical Path Suite',
    description: 'Business-critical user journeys',
    tags: ['smoke', 'positive'],
    categories: ['auth', 'dashboard']
  }
];

export function QuickSuiteBuilder({ onSuiteCreated, className }: QuickSuiteBuilderProps) {
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'tags' | 'categories'>('presets');

  // Form state
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [estimatedTests, setEstimatedTests] = useState(0);

  useEffect(() => {
    loadAvailableData();
  }, []);

  useEffect(() => {
    // Calculate estimated test count based on selections
    calculateEstimatedTests();
  }, [selectedTags, selectedCategories]);

  const loadAvailableData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch('http://localhost:8081/api/tests/categories/list'),
        fetch('http://localhost:8081/api/tests/tags/list')
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        if (categoriesData.success) {
          setAvailableCategories(categoriesData.categories);
        }
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        if (tagsData.success) {
          setAvailableTags(tagsData.tags);
        }
      }
    } catch (error) {
      console.error('Failed to load available data:', error);
      setError('Failed to load categories and tags');
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedTests = async () => {
    if (selectedTags.length === 0 && selectedCategories.length === 0) {
      setEstimatedTests(0);
      return;
    }

    // For now, calculate based on loaded data
    let count = 0;
    
    selectedCategories.forEach(category => {
      const cat = availableCategories.find(c => c.name === category);
      if (cat) count += cat.testCount;
    });

    selectedTags.forEach(tag => {
      const tagInfo = availableTags.find(t => t.name === tag);
      if (tagInfo) count += tagInfo.testCount;
    });

    // Avoid double counting - this is a rough estimate
    if (selectedTags.length > 0 && selectedCategories.length > 0) {
      count = Math.floor(count * 0.7); // Rough deduplication
    }

    setEstimatedTests(count);
  };

  const handlePresetSelection = (preset: PresetSuite) => {
    setSuiteName(preset.name);
    setSuiteDescription(preset.description);
    setSelectedTags(preset.tags);
    setSelectedCategories(preset.categories);
    setActiveTab('tags'); // Switch to show what was selected
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleCreateSuite = async () => {
    if (!suiteName.trim()) {
      setError('Please enter a suite name');
      return;
    }

    if (selectedTags.length === 0 && selectedCategories.length === 0) {
      setError('Please select at least one tag or category');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8081/api/tests/suites/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: suiteName,
          description: suiteDescription,
          tags: selectedTags,
          categories: selectedCategories,
          type: 'quick'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const createdSuite: Suite = {
          id: data.suite.id,
          name: data.suite.name,
          description: data.suite.description,
          testIds: data.suite.testIds,
          tags: data.suite.tags,
          createdAt: data.suite.createdAt
        };

        // Also store in localStorage for immediate availability
        const existingSuites = localStorage.getItem('playwright-smart-suites');
        const suites = existingSuites ? JSON.parse(existingSuites) : [];
        suites.push(data.suite);
        localStorage.setItem('playwright-smart-suites', JSON.stringify(suites));

        onSuiteCreated(createdSuite);
        
        // Reset form
        setSuiteName('');
        setSuiteDescription('');
        setSelectedTags([]);
        setSelectedCategories([]);
        setEstimatedTests(0);
        
      } else {
        setError(data.message || 'Failed to create suite');
      }
    } catch (error) {
      console.error('Failed to create suite:', error);
      setError('Failed to create suite');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-4 border rounded-md bg-muted ${className || ''}`}>
        <div className="flex items-center justify-center">
          <Clock className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading suite builder...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div>
        <h3 className="text-lg font-medium mb-2">Create Quick Suite</h3>
        <p className="text-sm text-muted-foreground">
          Build a test suite quickly using presets, tags, or categories
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b">
        {[
          { key: 'presets', label: 'Presets', icon: Zap },
          { key: 'tags', label: 'Tags', icon: Tag },
          { key: 'categories', label: 'Categories', icon: Folder }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === key
                ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`${key}-tab`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'presets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESET_SUITES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelection(preset)}
                className="p-4 border rounded-lg text-left hover:bg-muted transition-colors group"
                data-testid={`preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <h4 className="font-medium group-hover:text-primary">{preset.name}</h4>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{preset.description}</p>
                <div className="flex flex-wrap gap-1">
                  {preset.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                  {preset.categories.map((category) => (
                    <span key={category} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {category}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Select tags to include tests with those markers
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => handleTagToggle(tag.name)}
                  className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                    selectedTags.includes(tag.name)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  data-testid={`tag-${tag.name}`}
                >
                  <Tag className="h-3 w-3 inline mr-1" />
                  {tag.name} ({tag.testCount})
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Select categories to include all tests from those modules
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableCategories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => handleCategoryToggle(category.name)}
                  className={`p-3 rounded-md border text-left transition-colors ${
                    selectedCategories.includes(category.name)
                      ? 'bg-green-50 border-green-500 text-green-900'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                  data-testid={`category-${category.name}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    {selectedCategories.includes(category.name) && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {category.testCount} tests
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suite Form */}
      {(selectedTags.length > 0 || selectedCategories.length > 0 || suiteName) && (
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Suite Name *</label>
              <input
                type="text"
                value={suiteName}
                onChange={(e) => setSuiteName(e.target.value)}
                placeholder="Enter suite name..."
                className="input"
                data-testid="suite-name-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={suiteDescription}
                onChange={(e) => setSuiteDescription(e.target.value)}
                placeholder="Optional description..."
                className="input h-20 resize-none"
                data-testid="suite-description-input"
              />
            </div>

            {estimatedTests > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-blue-700">
                  Estimated: <strong>{estimatedTests} tests</strong> will be included
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCreateSuite}
                disabled={creating || !suiteName.trim() || (selectedTags.length === 0 && selectedCategories.length === 0)}
                className="button button-primary flex items-center gap-2"
                data-testid="create-suite-button"
              >
                {creating ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {creating ? 'Creating...' : 'Create Suite'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setSuiteName('');
                  setSuiteDescription('');
                  setSelectedTags([]);
                  setSelectedCategories([]);
                  setError(null);
                }}
                className="button button-outline"
                data-testid="reset-form-button"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}