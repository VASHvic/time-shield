import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SiteCard } from './SiteCard';

describe('SiteCard', () => {
  const emptyTime = { today: 0, total: 0 };

  it('renders the site name, today and total usage', () => {
    render(
      <SiteCard site="youtube.com" timeInfo={{ today: 0, total: 4500 }} onRemove={() => {}} />,
    );

    expect(screen.getByText('youtube.com')).toBeInTheDocument();
    expect(screen.getByText('0m today')).toBeInTheDocument();
    expect(screen.getByText('Total: 1h 15m')).toBeInTheDocument();
  });

  it('shows a gold chip when there is usage today', () => {
    render(
      <SiteCard site="reddit.com" timeInfo={{ today: 900, total: 1800 }} onRemove={() => {}} />,
    );

    const chip = screen.getByText('15m today');
    expect(chip).toHaveClass('bg-amber-100');
    expect(screen.queryByText('0m today')).not.toBeInTheDocument();
  });

  it('calls onRemove when the remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<SiteCard site="reddit.com" timeInfo={emptyTime} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove reddit.com' }));
    expect(onRemove).toHaveBeenCalledWith('reddit.com');
  });

  it('disables the remove button when disabled', () => {
    render(<SiteCard site="reddit.com" timeInfo={emptyTime} onRemove={() => {}} disabled />);

    expect(screen.getByRole('button', { name: 'Remove reddit.com' })).toBeDisabled();
  });
});
