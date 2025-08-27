import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StepDetail } from '../StepDetail';
import { TraceStep, TraceArtifact, ConsoleLog, NetworkLog } from '../../../types/trace';

const mockStep: TraceStep = {
  id: 'step-1',
  runId: 'run-1',
  testId: 'test-1',
  testName: 'Login Test',
  stepIndex: 0,
  actionType: 'click',
  actionName: 'Click login button',
  selector: 'button[data-testid="login-button"]',
  url: 'https://example.com/login',
  startedAt: '2024-01-01T10:00:00.000Z',
  finishedAt: '2024-01-01T10:00:01.000Z',
  duration: 1000,
  status: 'passed',
  retryCount: 0,
  createdAt: '2024-01-01T10:00:00.000Z'
};

const mockFailedStep: TraceStep = {
  ...mockStep,
  id: 'step-2',
  status: 'failed',
  errorMessage: 'Element not found',
  stackTrace: 'Error: Element not found\n    at test.spec.ts:15:10',
  expectedValue: 'true',
  actualValue: 'false',
  retryCount: 2
};

const mockArtifacts: TraceArtifact[] = [
  {
    id: 'artifact-1',
    runId: 'run-1',
    stepId: 'step-1',
    artifactType: 'screenshot',
    name: 'screenshot.png',
    filePath: '/path/to/screenshot.png',
    fileUrl: 'http://localhost:3001/api/reports/runs/run-1/media/artifact-1',
    mimeType: 'image/png',
    fileSize: 1024,
    width: 1920,
    height: 1080,
    createdAt: '2024-01-01T10:00:00.000Z'
  },
  {
    id: 'artifact-2',
    runId: 'run-1',
    stepId: 'step-1',
    artifactType: 'video',
    name: 'recording.webm',
    filePath: '/path/to/recording.webm',
    fileUrl: 'http://localhost:3001/api/reports/runs/run-1/media/artifact-2',
    mimeType: 'video/webm',
    fileSize: 5120,
    duration: 30000,
    createdAt: '2024-01-01T10:00:00.000Z'
  }
];

const mockConsoleLogs: ConsoleLog[] = [
  {
    id: 'log-1',
    runId: 'run-1',
    stepId: 'step-1',
    timestamp: '2024-01-01T10:00:00.500Z',
    level: 'error',
    source: 'console',
    message: 'TypeError: Cannot read property of undefined',
    url: 'https://example.com/login',
    lineNumber: 42,
    columnNumber: 15,
    createdAt: '2024-01-01T10:00:00.000Z'
  },
  {
    id: 'log-2',
    runId: 'run-1',
    stepId: 'step-1',
    timestamp: '2024-01-01T10:00:00.800Z',
    level: 'info',
    source: 'console',
    message: 'User logged in successfully',
    createdAt: '2024-01-01T10:00:00.000Z'
  }
];

const mockNetworkLogs: NetworkLog[] = [
  {
    id: 'net-1',
    runId: 'run-1',
    stepId: 'step-1',
    timestamp: '2024-01-01T10:00:00.200Z',
    method: 'POST',
    url: 'https://api.example.com/login',
    statusCode: 200,
    statusText: 'OK',
    duration: 150,
    failed: false,
    requestSize: 256,
    responseSize: 512,
    createdAt: '2024-01-01T10:00:00.000Z'
  },
  {
    id: 'net-2',
    runId: 'run-1',
    stepId: 'step-1',
    timestamp: '2024-01-01T10:00:00.400Z',
    method: 'GET',
    url: 'https://api.example.com/user',
    statusCode: 404,
    statusText: 'Not Found',
    duration: 75,
    failed: true,
    failureReason: 'User not found',
    createdAt: '2024-01-01T10:00:00.000Z'
  }
];

const defaultProps = {
  step: mockStep,
  artifacts: mockArtifacts,
  logs: [...mockConsoleLogs, ...mockNetworkLogs],
  onArtifactClick: jest.fn(),
  onDownloadArtifact: jest.fn()
};

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

describe('StepDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders step information correctly', () => {
    render(<StepDetail {...defaultProps} />);

    expect(screen.getByTestId('step-detail')).toBeInTheDocument();
    expect(screen.getByText('Click login button')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Login Test')).toBeInTheDocument();
    expect(screen.getByText('button[data-testid="login-button"]')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/login')).toBeInTheDocument();
  });

  test('displays status icon correctly for passed step', () => {
    render(<StepDetail {...defaultProps} />);

    // Check for green checkmark (passed status)
    const statusIcon = screen.getByText('Click login button')
      .closest('.step-header')
      ?.querySelector('svg');
    expect(statusIcon).toBeInTheDocument();
  });

  test('displays status icon correctly for failed step', () => {
    render(<StepDetail {...defaultProps} step={mockFailedStep} />);

    // Should show red X icon for failed status
    const statusIcon = screen.getByText('Click login button')
      .closest('.step-header')
      ?.querySelector('svg');
    expect(statusIcon).toBeInTheDocument();
  });

  test('shows error message for failed steps', () => {
    render(<StepDetail {...defaultProps} step={mockFailedStep} />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Element not found')).toBeInTheDocument();
  });

  test('shows retry count when greater than 0', () => {
    render(<StepDetail {...defaultProps} step={mockFailedStep} />);

    expect(screen.getByText('2 retries')).toBeInTheDocument();
  });

  test('displays expected vs actual values', () => {
    render(<StepDetail {...defaultProps} step={mockFailedStep} />);

    expect(screen.getByText('Expected')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('Actual')).toBeInTheDocument();
    expect(screen.getByText('false')).toBeInTheDocument();
  });

  test('shows artifacts section with correct count', () => {
    render(<StepDetail {...defaultProps} />);

    expect(screen.getByText('Artifacts (2)')).toBeInTheDocument();
  });

  test('displays artifacts by type', () => {
    render(<StepDetail {...defaultProps} />);

    // Expand artifacts section (it's expanded by default)
    expect(screen.getByText('Screenshots (1)')).toBeInTheDocument();
    expect(screen.getByText('Videos (1)')).toBeInTheDocument();
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    expect(screen.getByText('recording.webm')).toBeInTheDocument();
  });

  test('handles artifact click', () => {
    const onArtifactClick = jest.fn();
    render(<StepDetail {...defaultProps} onArtifactClick={onArtifactClick} />);

    const previewButton = screen.getAllByTitle('Preview')[0];
    fireEvent.click(previewButton);

    expect(onArtifactClick).toHaveBeenCalledWith(mockArtifacts[0]);
  });

  test('handles artifact download', () => {
    const onDownloadArtifact = jest.fn();
    render(<StepDetail {...defaultProps} onDownloadArtifact={onDownloadArtifact} />);

    const downloadButton = screen.getAllByTitle('Download')[0];
    fireEvent.click(downloadButton);

    expect(onDownloadArtifact).toHaveBeenCalledWith(mockArtifacts[0]);
  });

  test('shows logs section with correct count', () => {
    render(<StepDetail {...defaultProps} />);

    expect(screen.getByText('Logs (4)')).toBeInTheDocument();
  });

  test('displays console and network log tabs', () => {
    render(<StepDetail {...defaultProps} />);

    expect(screen.getByText('Console (2)')).toBeInTheDocument();
    expect(screen.getByText('Network (2)')).toBeInTheDocument();
  });

  test('switches between log tabs', () => {
    render(<StepDetail {...defaultProps} />);

    // Default should show console logs
    expect(screen.getByText('TypeError: Cannot read property of undefined')).toBeInTheDocument();

    // Click network tab
    const networkTab = screen.getByText('Network (2)');
    fireEvent.click(networkTab);

    // Should show network logs
    expect(screen.getByText('POST https://api.example.com/login')).toBeInTheDocument();
  });

  test('displays console log details', () => {
    render(<StepDetail {...defaultProps} />);

    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('TypeError: Cannot read property of undefined')).toBeInTheDocument();
  });

  test('displays network log details', () => {
    render(<StepDetail {...defaultProps} />);

    // Click network tab
    const networkTab = screen.getByText('Network (2)');
    fireEvent.click(networkTab);

    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('200 OK')).toBeInTheDocument();
    expect(screen.getByText('404 Not Found')).toBeInTheDocument();
  });

  test('shows stack trace section for failed steps', () => {
    render(<StepDetail {...defaultProps} step={mockFailedStep} />);

    expect(screen.getByText('Stack Trace')).toBeInTheDocument();
  });

  test('expands and collapses stack trace', () => {
    render(<StepDetail {...defaultProps} step={mockFailedStep} />);

    const stackTraceButton = screen.getByText('Stack Trace');
    
    // Should be expanded by default for failed steps
    expect(screen.getByText('Error: Element not found')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(stackTraceButton);

    // Stack trace content should be hidden
    expect(screen.queryByText('Error: Element not found')).not.toBeInTheDocument();
  });

  test('shows metadata section', () => {
    render(<StepDetail {...defaultProps} />);

    expect(screen.getByText('Metadata')).toBeInTheDocument();
  });

  test('expands metadata section', () => {
    render(<StepDetail {...defaultProps} />);

    const metadataButton = screen.getByText('Metadata');
    fireEvent.click(metadataButton);

    expect(screen.getByText('Step ID:')).toBeInTheDocument();
    expect(screen.getByText('Run ID:')).toBeInTheDocument();
    expect(screen.getByText('step-1')).toBeInTheDocument();
    expect(screen.getByText('run-1')).toBeInTheDocument();
  });

  test('handles copy to clipboard', async () => {
    render(<StepDetail {...defaultProps} />);

    const copyButton = screen.getAllByTitle('Copy selector')[0];
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('button[data-testid="login-button"]');
    });
  });

  test('handles copy URL for logs', async () => {
    render(<StepDetail {...defaultProps} />);

    // Find the external link button in console logs
    const urlButton = screen.getAllByTitle('Copy URL')[0];
    fireEvent.click(urlButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/login');
    });
  });

  test('displays duration information', () => {
    render(<StepDetail {...defaultProps} />);

    expect(screen.getByText('1.0s')).toBeInTheDocument();
  });

  test('displays file size and dimensions for artifacts', () => {
    render(<StepDetail {...defaultProps} />);

    expect(screen.getByText('image/png • 1.0 KB • 1920×1080')).toBeInTheDocument();
    expect(screen.getByText('video/webm • 5.0 KB • 30.0s')).toBeInTheDocument();
  });

  test('toggles section expansion', () => {
    render(<StepDetail {...defaultProps} />);

    const artifactsButton = screen.getByText('Artifacts (2)');
    
    // Should be expanded by default
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(artifactsButton);

    // Content should be hidden
    expect(screen.queryByText('screenshot.png')).not.toBeInTheDocument();

    // Click to expand again
    fireEvent.click(artifactsButton);

    // Content should be visible again
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
  });

  test('shows step timing information', () => {
    render(<StepDetail {...defaultProps} />);

    // Should display start time
    expect(screen.getByText(/1\/1\/2024, 10:00:00 AM/)).toBeInTheDocument();
  });

  test('handles empty artifacts gracefully', () => {
    render(<StepDetail {...defaultProps} artifacts={[]} />);

    expect(screen.queryByText('Artifacts')).not.toBeInTheDocument();
  });

  test('handles empty logs gracefully', () => {
    render(<StepDetail {...defaultProps} logs={[]} />);

    expect(screen.queryByText('Logs')).not.toBeInTheDocument();
  });

  test('shows appropriate action icon', () => {
    render(<StepDetail {...defaultProps} />);

    // Check that the action icon container exists
    const actionIconContainer = screen.getByText('Click login button')
      .closest('.step-header')
      ?.querySelector('.w-10.h-10');
    expect(actionIconContainer).toBeInTheDocument();
  });

  test('displays log level colors correctly', () => {
    render(<StepDetail {...defaultProps} />);

    const errorLog = screen.getByText('ERROR');
    expect(errorLog).toHaveClass('text-red-600');

    const infoLog = screen.getByText('INFO');
    expect(infoLog).toHaveClass('text-blue-600');
  });

  test('shows network request/response sizes', () => {
    render(<StepDetail {...defaultProps} />);

    // Click network tab
    const networkTab = screen.getByText('Network (2)');
    fireEvent.click(networkTab);

    expect(screen.getByText('Request: 256 B')).toBeInTheDocument();
    expect(screen.getByText('Response: 512 B')).toBeInTheDocument();
  });

  test('handles network log failure reasons', () => {
    render(<StepDetail {...defaultProps} />);

    // Click network tab
    const networkTab = screen.getByText('Network (2)');
    fireEvent.click(networkTab);

    expect(screen.getByText('Error: User not found')).toBeInTheDocument();
  });

  test('does not show preview button for non-visual artifacts', () => {
    const logArtifact: TraceArtifact = {
      id: 'artifact-3',
      runId: 'run-1',
      stepId: 'step-1',
      artifactType: 'log',
      name: 'test.log',
      filePath: '/path/to/test.log',
      mimeType: 'text/plain',
      createdAt: '2024-01-01T10:00:00.000Z'
    };

    render(<StepDetail {...defaultProps} artifacts={[logArtifact]} />);

    // Should not have preview button for log files
    expect(screen.queryByTitle('Preview')).not.toBeInTheDocument();
    expect(screen.getByTitle('Download')).toBeInTheDocument();
  });
});