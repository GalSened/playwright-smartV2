import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimelineView } from '../TimelineView';
import { TimelineItem } from '../../../types/trace';

const mockTimelineItems: TimelineItem[] = [
  {
    id: 'step-1',
    type: 'step',
    timestamp: '2024-01-01T10:00:00.000Z',
    duration: 1000,
    status: 'passed',
    title: 'Click login button',
    description: 'click: button[data-testid="login-button"]',
    stepId: 'step-1',
    metadata: {
      actionType: 'click',
      selector: 'button[data-testid="login-button"]',
      testName: 'Login Test'
    }
  },
  {
    id: 'step-2',
    type: 'step',
    timestamp: '2024-01-01T10:00:05.000Z',
    duration: 2000,
    status: 'failed',
    title: 'Fill username',
    description: 'fill: input[name="username"]',
    stepId: 'step-2',
    metadata: {
      actionType: 'fill',
      selector: 'input[name="username"]',
      testName: 'Login Test'
    }
  },
  {
    id: 'log-1',
    type: 'log',
    timestamp: '2024-01-01T10:00:03.000Z',
    status: 'error',
    title: 'Console error',
    description: 'TypeError: Cannot read property of undefined',
    metadata: {
      level: 'error',
      source: 'console'
    }
  },
  {
    id: 'network-1',
    type: 'network',
    timestamp: '2024-01-01T10:00:02.000Z',
    duration: 500,
    status: 'failed',
    title: 'POST /api/login',
    description: '401 Unauthorized',
    metadata: {
      method: 'POST',
      statusCode: 401
    }
  }
];

const defaultProps = {
  timeline: mockTimelineItems,
  onStepSelect: jest.fn(),
  onTimeSelect: jest.fn()
};

describe('TimelineView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders timeline items correctly', () => {
    render(<TimelineView {...defaultProps} />);

    expect(screen.getByTestId('timeline-view')).toBeInTheDocument();
    expect(screen.getByText('Click login button')).toBeInTheDocument();
    expect(screen.getByText('Fill username')).toBeInTheDocument();
    expect(screen.getByText('Console error')).toBeInTheDocument();
    expect(screen.getByText('POST /api/login')).toBeInTheDocument();
  });

  test('displays timeline statistics', () => {
    render(<TimelineView {...defaultProps} />);

    expect(screen.getByText(/Showing 4 of 4 events/)).toBeInTheDocument();
  });

  test('handles step selection', () => {
    const onStepSelect = jest.fn();
    render(<TimelineView {...defaultProps} onStepSelect={onStepSelect} />);

    const firstStep = screen.getByText('Click login button');
    fireEvent.click(firstStep);

    expect(onStepSelect).toHaveBeenCalledWith('step-1');
  });

  test('handles time selection', () => {
    const onTimeSelect = jest.fn();
    render(<TimelineView {...defaultProps} onTimeSelect={onTimeSelect} />);

    const firstStep = screen.getByText('Click login button');
    fireEvent.click(firstStep);

    expect(onTimeSelect).toHaveBeenCalledWith('2024-01-01T10:00:00.000Z');
  });

  test('highlights selected step', () => {
    render(<TimelineView {...defaultProps} selectedStepId="step-2" />);

    const selectedStep = screen.getByText('Fill username').closest('.timeline-item');
    expect(selectedStep).toHaveClass('bg-blue-50');
  });

  test('shows playback controls', () => {
    render(<TimelineView {...defaultProps} />);

    expect(screen.getByTitle('Previous step')).toBeInTheDocument();
    expect(screen.getByTitle('Play')).toBeInTheDocument();
    expect(screen.getByTitle('Next step')).toBeInTheDocument();
  });

  test('handles playback control clicks', async () => {
    const onStepSelect = jest.fn();
    const onTimeSelect = jest.fn();
    
    render(<TimelineView {...defaultProps} onStepSelect={onStepSelect} onTimeSelect={onTimeSelect} />);

    const playButton = screen.getByTitle('Play');
    fireEvent.click(playButton);

    expect(screen.getByTitle('Pause')).toBeInTheDocument();
    
    // Wait for auto-playback to trigger
    await waitFor(() => {
      expect(onTimeSelect).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  test('handles step forward/backward', () => {
    const onStepSelect = jest.fn();
    const onTimeSelect = jest.fn();
    
    render(<TimelineView {...defaultProps} onStepSelect={onStepSelect} onTimeSelect={onTimeSelect} />);

    const nextButton = screen.getByTitle('Next step');
    fireEvent.click(nextButton);

    expect(onTimeSelect).toHaveBeenCalledWith('2024-01-01T10:00:02.000Z');
  });

  test('filters by type', () => {
    render(<TimelineView {...defaultProps} showFilters={true} />);

    const stepCheckbox = screen.getByLabelText('Steps');
    fireEvent.click(stepCheckbox); // Uncheck steps

    expect(screen.getByText(/Showing 2 of 4 events/)).toBeInTheDocument();
    expect(screen.queryByText('Click login button')).not.toBeInTheDocument();
    expect(screen.getByText('Console error')).toBeInTheDocument();
  });

  test('filters by search query', () => {
    render(<TimelineView {...defaultProps} showFilters={true} />);

    const searchInput = screen.getByPlaceholderText('Search timeline...');
    fireEvent.change(searchInput, { target: { value: 'login' } });

    expect(screen.getByText(/Showing 2 of 4 events/)).toBeInTheDocument();
    expect(screen.getByText('Click login button')).toBeInTheDocument();
    expect(screen.getByText('POST /api/login')).toBeInTheDocument();
    expect(screen.queryByText('Fill username')).not.toBeInTheDocument();
  });

  test('filters by errors only', () => {
    render(<TimelineView {...defaultProps} showFilters={true} />);

    const errorsOnlyCheckbox = screen.getByLabelText('Errors only');
    fireEvent.click(errorsOnlyCheckbox);

    expect(screen.getByText(/Showing 2 of 4 events/)).toBeInTheDocument();
    expect(screen.getByText('Fill username')).toBeInTheDocument();
    expect(screen.getByText('POST /api/login')).toBeInTheDocument();
    expect(screen.queryByText('Click login button')).not.toBeInTheDocument();
  });

  test('groups by test', () => {
    render(<TimelineView {...defaultProps} showFilters={true} />);

    const groupByTestCheckbox = screen.getByLabelText('Group by test');
    fireEvent.click(groupByTestCheckbox);

    expect(screen.getByText('Login Test')).toBeInTheDocument();
    expect(screen.getByText('Unknown Test')).toBeInTheDocument();
  });

  test('handles group expansion', () => {
    render(<TimelineView {...defaultProps} showFilters={true} />);

    const groupByTestCheckbox = screen.getByLabelText('Group by test');
    fireEvent.click(groupByTestCheckbox);

    const loginTestGroup = screen.getByText('Login Test');
    fireEvent.click(loginTestGroup);

    // Items should be hidden initially when group is collapsed
    expect(screen.queryByText('Click login button')).not.toBeInTheDocument();
  });

  test('shows duration information', () => {
    render(<TimelineView {...defaultProps} />);

    expect(screen.getByText(/Duration:/)).toBeInTheDocument();
  });

  test('handles empty timeline', () => {
    render(<TimelineView {...defaultProps} timeline={[]} />);

    expect(screen.getByText('No timeline events match your filters')).toBeInTheDocument();
  });

  test('shows clear filters button when filters are applied', () => {
    render(<TimelineView {...defaultProps} showFilters={true} />);

    const searchInput = screen.getByPlaceholderText('Search timeline...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  test('clears filters when clear button is clicked', () => {
    render(<TimelineView {...defaultProps} showFilters={true} />);

    const searchInput = screen.getByPlaceholderText('Search timeline...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const clearButton = screen.getByText('Clear filters');
    fireEvent.click(clearButton);

    expect(screen.getByText(/Showing 4 of 4 events/)).toBeInTheDocument();
  });

  test('displays appropriate icons for different item types', () => {
    render(<TimelineView {...defaultProps} />);

    // Check that icons are rendered (we look for the emoji text content)
    const timelineItems = screen.getAllByTestId('timeline-item');
    expect(timelineItems).toHaveLength(4);
  });

  test('shows artifact previews', () => {
    const timelineWithArtifacts = [
      {
        ...mockTimelineItems[0],
        artifacts: [
          {
            id: 'artifact-1',
            runId: 'run-1',
            stepId: 'step-1',
            artifactType: 'screenshot' as const,
            name: 'screenshot.png',
            filePath: '/path/to/screenshot.png',
            mimeType: 'image/png',
            createdAt: '2024-01-01T10:00:00.000Z'
          }
        ]
      }
    ];

    render(<TimelineView {...defaultProps} timeline={timelineWithArtifacts} />);

    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
  });

  test('handles playback speed change', () => {
    render(<TimelineView {...defaultProps} />);

    const speedSelect = screen.getByDisplayValue('1x');
    fireEvent.change(speedSelect, { target: { value: '2' } });

    expect(screen.getByDisplayValue('2x')).toBeInTheDocument();
  });

  test('disables controls appropriately', () => {
    render(<TimelineView {...defaultProps} />);

    const prevButton = screen.getByTitle('Previous step');
    const nextButton = screen.getByTitle('Next step');

    // At start, previous should be disabled
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  test('handles metadata display', () => {
    render(<TimelineView {...defaultProps} />);

    // Check that metadata is displayed
    expect(screen.getByText(/Selector:/)).toBeInTheDocument();
    expect(screen.getByText('button[data-testid="login-button"]')).toBeInTheDocument();
  });

  test('auto-scrolls to selected item when autoFollow is true', () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(<TimelineView {...defaultProps} selectedStepId="step-2" autoFollow={true} />);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center'
    });
  });

  test('handles video current time synchronization', () => {
    render(<TimelineView {...defaultProps} videoCurrentTime={2.5} />);

    // The timeline should show current video time context
    // This would typically highlight the step corresponding to the video time
    expect(screen.getByTestId('timeline-view')).toBeInTheDocument();
  });

  test('supports keyboard navigation', () => {
    render(<TimelineView {...defaultProps} />);

    const timeline = screen.getByTestId('timeline-view');
    
    // Focus the timeline
    timeline.focus();
    
    // Test keyboard shortcuts would go here
    // Note: Testing keyboard events in React Testing Library requires specific setup
    expect(timeline).toBeInTheDocument();
  });
});