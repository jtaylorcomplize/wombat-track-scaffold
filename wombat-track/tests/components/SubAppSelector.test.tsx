import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubAppSelector } from '../../src/components/layout/SubAppSelector';
import { mockPrograms } from '../../src/data/mockPrograms';

describe('SubAppSelector', () => {
  const mockOnSubAppChange = jest.fn();

  beforeEach(() => {
    mockOnSubAppChange.mockClear();
  });

  it('renders current Sub-App with branding', () => {
    render(
      <SubAppSelector
        currentSubApp="prog-orbis-001"
        onSubAppChange={mockOnSubAppChange}
        availableSubApps={mockPrograms}
        showBranding={true}
      />
    );

    expect(screen.getByText('Orbis')).toBeInTheDocument();
    expect(screen.getByText('Core')).toBeInTheDocument();
  });

  it('shows dropdown when clicked', () => {
    render(
      <SubAppSelector
        currentSubApp="prog-orbis-001"
        onSubAppChange={mockOnSubAppChange}
        availableSubApps={mockPrograms}
      />
    );

    const selector = screen.getByRole('button');
    fireEvent.click(selector);

    expect(screen.getByText('Complize')).toBeInTheDocument();
    expect(screen.getByText('MetaPlatform')).toBeInTheDocument();
  });

  it('calls onSubAppChange when selecting different Sub-App', () => {
    render(
      <SubAppSelector
        currentSubApp="prog-orbis-001"
        onSubAppChange={mockOnSubAppChange}
        availableSubApps={mockPrograms}
      />
    );

    const selector = screen.getByRole('button');
    fireEvent.click(selector);

    const complizeOption = screen.getByText('Complize');
    fireEvent.click(complizeOption);

    expect(mockOnSubAppChange).toHaveBeenCalledWith('prog-complize-001');
  });

  it('does not show dropdown for single Sub-App users', () => {
    render(
      <SubAppSelector
        currentSubApp="prog-orbis-001"
        onSubAppChange={mockOnSubAppChange}
        availableSubApps={[mockPrograms[0]]}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Orbis')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('displays correct Sub-App status', () => {
    render(
      <SubAppSelector
        currentSubApp="prog-complize-001"
        onSubAppChange={mockOnSubAppChange}
        availableSubApps={mockPrograms}
      />
    );

    const selector = screen.getByRole('button');
    fireEvent.click(selector);

    const activeStatuses = screen.getAllByText('Active');
    expect(activeStatuses.length).toBeGreaterThan(0);
    expect(screen.getByText('Planning')).toBeInTheDocument();
  });
});