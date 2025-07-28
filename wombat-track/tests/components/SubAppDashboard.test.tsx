import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubAppDashboard } from '../../src/components/SubAppDashboard';
import { mockPrograms } from '../../src/data/mockPrograms';

describe('SubAppDashboard', () => {
  const mockOnWorkSurfaceSelect = jest.fn();

  beforeEach(() => {
    mockOnWorkSurfaceSelect.mockClear();
  });

  it('renders welcome message with Sub-App name', () => {
    render(
      <SubAppDashboard
        subApp={mockPrograms[0]}
        onWorkSurfaceSelect={mockOnWorkSurfaceSelect}
      />
    );

    expect(screen.getByText('Welcome to Orbis')).toBeInTheDocument();
    expect(screen.getByText(mockPrograms[0].description)).toBeInTheDocument();
  });

  it('displays Sub-App status and type', () => {
    render(
      <SubAppDashboard
        subApp={mockPrograms[1]}
        onWorkSurfaceSelect={mockOnWorkSurfaceSelect}
      />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Sub-App')).toBeInTheDocument();
  });

  it('renders work surface cards', () => {
    render(
      <SubAppDashboard
        subApp={mockPrograms[0]}
        onWorkSurfaceSelect={mockOnWorkSurfaceSelect}
      />
    );

    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Govern')).toBeInTheDocument();
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('calls onWorkSurfaceSelect when card is clicked', () => {
    render(
      <SubAppDashboard
        subApp={mockPrograms[0]}
        onWorkSurfaceSelect={mockOnWorkSurfaceSelect}
      />
    );

    const planCard = screen.getByText('Plan').closest('button');
    fireEvent.click(planCard!);

    expect(mockOnWorkSurfaceSelect).toHaveBeenCalledWith('plan');
  });

  it('displays program health indicator', () => {
    render(
      <SubAppDashboard
        subApp={mockPrograms[0]}
        onWorkSurfaceSelect={mockOnWorkSurfaceSelect}
      />
    );

    expect(screen.getByText('Program Health')).toBeInTheDocument();
    // Should display one of the health status messages
    const healthStatus = screen.getByText(/All Systems Go|Needs Attention|Critical Issues/);
    expect(healthStatus).toBeInTheDocument();
  });

  it('shows metrics in work surface cards', () => {
    render(
      <SubAppDashboard
        subApp={mockPrograms[0]}
        onWorkSurfaceSelect={mockOnWorkSurfaceSelect}
      />
    );

    expect(screen.getByText('Active Phases')).toBeInTheDocument();
    expect(screen.getByText('Governance Logs')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Template Sets')).toBeInTheDocument();
  });

  it('displays recent activity section', () => {
    render(
      <SubAppDashboard
        subApp={mockPrograms[0]}
        onWorkSurfaceSelect={mockOnWorkSurfaceSelect}
      />
    );

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText(/Phase.*completed/)).toBeInTheDocument();
    expect(screen.getByText(/New blocker/)).toBeInTheDocument();
  });

  it('applies correct Sub-App branding colors', () => {
    const { container } = render(
      <SubAppDashboard
        subApp={mockPrograms[1]} // Complize with red branding
        onWorkSurfaceSelect={mockOnWorkSurfaceSelect}
      />
    );

    // Check for Complize's red accent color in styles
    const brandedElements = container.querySelectorAll('[style*="#DC2626"]');
    expect(brandedElements.length).toBeGreaterThan(0);
  });
});