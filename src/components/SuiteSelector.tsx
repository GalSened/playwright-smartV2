import React, { useState, useEffect } from 'react';
import { ChevronDown, Package, Users, Clock, AlertCircle } from 'lucide-react';
import type { Suite } from '@/app/types';

interface SuiteSelectorProps {
  selectedSuite?: Suite | null;
  onSuiteSelect: (suite: Suite | null) => void;
  className?: string;
}

interface ExistingSuite {
  id: string;
  name: string;
  description?: string;
  testIds: string[];
  tags: string[];
  createdAt: string;
  type?: string;
}

export function SuiteSelector({ selectedSuite, onSuiteSelect, className }: SuiteSelectorProps) {
  const [existingSuites, setExistingSuites] = useState<ExistingSuite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadExistingSuites();
  }, []);

  const loadExistingSuites = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to get from localStorage (existing suites)
      const storedSuites = localStorage.getItem('playwright-smart-suites');
      let localSuites: ExistingSuite[] = storedSuites ? JSON.parse(storedSuites) : [];
      
      // Add some default suites if none exist
      if (localSuites.length === 0) {
        const defaultSuites: ExistingSuite[] = [
          {
            id: 'suite-smoke-default',
            name: 'Smoke Test Suite',
            description: 'Essential smoke tests for quick validation',
            testIds: [], // Will be populated with actual smoke tests
            tags: ['smoke'],
            createdAt: new Date().toISOString(),
            type: 'preset'
          },
          {
            id: 'suite-regression-default', 
            name: 'Regression Suite',
            description: 'Comprehensive regression testing',
            testIds: [], // Will be populated with regression tests
            tags: ['regression'],
            createdAt: new Date().toISOString(),
            type: 'preset'
          },
          {
            id: 'suite-auth-default',
            name: 'Authentication Suite',
            description: 'All authentication and login tests',
            testIds: [], // Will be populated with auth tests
            tags: ['auth'],
            createdAt: new Date().toISOString(),
            type: 'preset'
          }
        ];
        
        // Store default suites
        localStorage.setItem('playwright-smart-suites', JSON.stringify(defaultSuites));
        localSuites = defaultSuites;
      }

      // Try to get from backend API as well
      try {
        const response = await fetch('http://localhost:8083/api/tests/suites/list');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.suites) {
            // Merge with local suites
            const allSuites = [...localSuites, ...data.suites];
            setExistingSuites(allSuites);
          } else {
            setExistingSuites(localSuites);
          }
        } else {
          setExistingSuites(localSuites);
        }
      } catch (apiError) {
        console.warn('Could not fetch suites from API, using local data:', apiError);
        setExistingSuites(localSuites);
      }
      
    } catch (error) {
      console.error('Failed to load existing suites:', error);
      setError('Failed to load test suites');
      setExistingSuites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuiteSelection = (suite: ExistingSuite) => {
    // Convert to Suite format expected by scheduler
    const selectedSuiteData: Suite = {
      id: suite.id,
      name: suite.name,
      description: suite.description || '',
      testIds: suite.testIds,
      tags: suite.tags,
      createdAt: suite.createdAt
    };
    
    onSuiteSelect(selectedSuiteData);
    setIsOpen(false);
  };

  const getSuiteIcon = (suite: ExistingSuite) => {
    if (suite.type === 'preset') return <Package className="h-4 w-4 text-blue-500" />;
    return <Users className="h-4 w-4 text-green-500" />;
  };

  const getSuiteTypeLabel = (suite: ExistingSuite) => {
    if (suite.type === 'preset') return 'Preset';
    return 'Custom';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className={`relative ${className || ''}`}>
        <div className="flex items-center justify-center p-3 border rounded-md bg-muted">
          <Clock className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading suites...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className || ''}`}>
      <label className="block text-sm font-medium mb-2">Select Existing Suite</label>
      
      {error && (
        <div className="flex items-center gap-2 p-2 mb-2 text-sm bg-red-50 border border-red-200 rounded-md text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 border rounded-md bg-background hover:bg-muted transition-colors"
          data-testid="suite-selector-trigger"
        >
          <div className="flex items-center space-x-2">
            {selectedSuite ? (
              <>
                {getSuiteIcon({ ...selectedSuite, type: 'custom' })}
                <div className="text-left">
                  <div className="font-medium">{selectedSuite.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedSuite.testIds.length} tests
                  </div>
                </div>
              </>
            ) : (
              <>
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Choose a test suite...</span>
              </>
            )}
          </div>
          <ChevronDown 
            className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
            {existingSuites.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No test suites found</div>
                <div className="text-xs">Create a suite first or refresh to load available suites</div>
              </div>
            ) : (
              <>
                {/* Clear selection option */}
                <button
                  type="button"
                  onClick={() => {
                    onSuiteSelect(null);
                    setIsOpen(false);
                  }}
                  className="w-full p-3 text-left hover:bg-muted transition-colors border-b"
                  data-testid="clear-suite-selection"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4" /> {/* Spacer */}
                    <span className="text-muted-foreground italic">Clear selection</span>
                  </div>
                </button>

                {/* Suite options */}
                {existingSuites.map((suite) => (
                  <button
                    key={suite.id}
                    type="button"
                    onClick={() => handleSuiteSelection(suite)}
                    className="w-full p-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                    data-testid={`suite-option-${suite.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getSuiteIcon(suite)}
                        <div className="flex-1">
                          <div className="font-medium">{suite.name}</div>
                          {suite.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {suite.description}
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {suite.testIds.length} tests
                            </span>
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {getSuiteTypeLabel(suite)}
                            </span>
                            {suite.tags.length > 0 && (
                              <div className="flex gap-1">
                                {suite.tags.slice(0, 2).map((tag) => (
                                  <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                                {suite.tags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{suite.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getTimeAgo(suite.createdAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {selectedSuite && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-xs text-blue-700">
            <strong>Selected:</strong> {selectedSuite.name} ({selectedSuite.testIds.length} tests)
          </div>
        </div>
      )}
    </div>
  );
}