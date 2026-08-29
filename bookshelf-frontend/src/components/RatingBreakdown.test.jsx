import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RatingBreakdown from './RatingBreakdown.jsx';

/**
 * Unit tests for the RatingBreakdown component.
 *
 * Validates the star-distribution bar chart renders correctly for various
 * input shapes.
 */

const sampleBreakdown = [
  { star: 5, count: 10 },
  { star: 4, count: 6 },
  { star: 3, count: 3 },
  { star: 2, count: 1 },
  { star: 1, count: 0 },
];

describe('RatingBreakdown', () => {
  it('renders all five star rows', () => {
    render(<RatingBreakdown breakdown={sampleBreakdown} totalReviews={20} />);
    expect(screen.getByText('5 ★')).toBeInTheDocument();
    expect(screen.getByText('4 ★')).toBeInTheDocument();
    expect(screen.getByText('3 ★')).toBeInTheDocument();
    expect(screen.getByText('2 ★')).toBeInTheDocument();
    expect(screen.getByText('1 ★')).toBeInTheDocument();
  });

  it('shows count for each star level', () => {
    render(<RatingBreakdown breakdown={sampleBreakdown} totalReviews={20} />);
    expect(screen.getByText(/10/)).toBeInTheDocument();
    expect(screen.getByText(/6/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('renders nothing for an empty breakdown', () => {
    const { container } = render(
      <RatingBreakdown breakdown={[]} totalReviews={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when breakdown is undefined', () => {
    const { container } = render(
      <RatingBreakdown breakdown={undefined} totalReviews={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('has accessible label', () => {
    render(<RatingBreakdown breakdown={sampleBreakdown} totalReviews={20} />);
    expect(screen.getByRole('img', { name: /rating distribution/i })).toBeInTheDocument();
  });
});
