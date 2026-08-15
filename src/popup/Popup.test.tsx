import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Popup } from './Popup.tsx';

async function seedStorage(values: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set(values);
}

describe('Popup', () => {
  it('renders header, no-limit prompt and empty state', () => {
    render(<Popup />);

    expect(screen.getByText('Time Shield')).toBeInTheDocument();
    expect(screen.getByText(/No daily limit set yet/)).toBeInTheDocument();
    expect(screen.getByText('No restricted sites yet')).toBeInTheDocument();
    expect(screen.getByText('Unlocked')).toBeInTheDocument();
  });

  it('shows remaining time, limit and usage progress when configured', async () => {
    await seedStorage({
      maxAllowedTime: 3600,
      remainingTime: 1800,
      restrictedSites: ['youtube.com'],
    });

    render(<Popup />);

    expect(await screen.findByText('30m')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('30m used today')).toBeInTheDocument();

    const progress = screen.getByLabelText('Daily limit usage');
    expect(progress).toHaveAttribute('max', '100');
    expect(progress).toHaveAttribute('value', '50');
  });

  it('reports when the limit is reached', async () => {
    await seedStorage({ maxAllowedTime: 3600, remainingTime: 0 });

    render(<Popup />);

    expect(await screen.findByText(/Limit reached for today/)).toBeInTheDocument();
  });

  it('saves a valid daily limit and shows the saved state', async () => {
    render(<Popup />);

    fireEvent.change(screen.getByLabelText('Daily limit'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Saved' })).toBeInTheDocument();
    const data = await chrome.storage.local.get(['maxAllowedTime', 'remainingTime']);
    expect(data.maxAllowedTime).toBe(3600);
    expect(data.remainingTime).toBe(3600);
  });

  it('rejects a time outside the allowed range', async () => {
    render(<Popup />);

    fireEvent.change(screen.getByLabelText('Daily limit'), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Limit must be between 1 and 1440 minutes')).toBeInTheDocument();
    const data = await chrome.storage.local.get(['maxAllowedTime']);
    expect(data.maxAllowedTime).toBeUndefined();
  });

  it('requires a daily limit on submit', async () => {
    render(<Popup />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a daily limit in minutes')).toBeInTheDocument();
  });

  it('hints when the entered site is already restricted', async () => {
    await seedStorage({ restrictedSites: ['youtube.com'] });
    render(<Popup />);

    const input = screen.getByLabelText('Website to limit');
    fireEvent.change(input, { target: { value: 'https://www.youtube.com' } });
    fireEvent.blur(input);

    expect(await screen.findByText('youtube.com is already restricted')).toBeInTheDocument();
  });

  it('shows the current tab as a hint and adds it to the URL field', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://www.youtube.com/watch?v=abc' } as chrome.tabs.Tab,
    ]);
    render(<Popup />);

    expect(await screen.findByText('Current tab: youtube.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByDisplayValue('youtube.com')).toBeInTheDocument();
  });

  it('does not show the current tab hint for non-web pages', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'chrome://extensions/' } as chrome.tabs.Tab,
    ]);
    render(<Popup />);

    expect(screen.queryByText(/Current tab:/)).not.toBeInTheDocument();
  });

  it('does not offer to add a site that is already restricted', async () => {
    await seedStorage({ restrictedSites: ['youtube.com'] });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://www.youtube.com/watch?v=abc' } as chrome.tabs.Tab,
    ]);
    render(<Popup />);

    expect(await screen.findByText('Current tab: youtube.com')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    });
  });

  it('disables inputs and shows the locked banner when locked', async () => {
    await seedStorage({ disabled: true });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://www.youtube.com/watch?v=abc' } as chrome.tabs.Tab,
    ]);
    render(<Popup />);

    expect(await screen.findByText(/Settings are locked/)).toBeInTheDocument();
    expect(screen.getByLabelText('Website to limit')).toBeDisabled();
    expect(screen.getByLabelText('Daily limit')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Time locked' })).toBeDisabled();
  });

  it('locks time through the confirm dialog', async () => {
    render(<Popup />);

    fireEvent.click(screen.getByRole('button', { name: 'Lock time limit' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, Lock Time' }));

    expect(await screen.findByText(/Settings are locked/)).toBeInTheDocument();
    const data = await chrome.storage.local.get(['disabled']);
    expect(data.disabled).toBe(true);
  });

  it('lists restricted sites with usage', async () => {
    await seedStorage({ restrictedSites: ['youtube.com'] });
    render(<Popup />);

    expect(await screen.findByText('youtube.com')).toBeInTheDocument();
    expect(screen.getByText('0m today')).toBeInTheDocument();
  });

  it('pauses for 15 minutes through the pause menu', async () => {
    await seedStorage({ maxAllowedTime: 3600 });
    render(<Popup />);

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'For 15 minutes' }));

    const data = await chrome.storage.local.get(['pausedUntil']);
    expect(data.pausedUntil).toBeTypeOf('number');
    expect(await screen.findByText(/Paused — enforcement is off/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });

  it('lets you add several suggested sites before finishing onboarding', async () => {
    render(<Popup />);

    expect(await screen.findByText('Welcome to Time Shield')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'x.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'youtube.com' }));

    // Both are added and the card stays open until "Done"
    let data = await chrome.storage.local.get(['restrictedSites', 'onboardingDone']);
    expect(data.restrictedSites).toEqual(['x.com', 'youtube.com']);
    expect(data.onboardingDone).toBeUndefined();
    expect(screen.getByText('Welcome to Time Shield')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    data = await chrome.storage.local.get(['onboardingDone']);
    expect(data.onboardingDone).toBe(true);
    expect(screen.queryByText('Welcome to Time Shield')).not.toBeInTheDocument();
  });

  it('removes a restricted site', async () => {
    await seedStorage({
      restrictedSites: ['youtube.com', 'reddit.com'],
      onboardingDone: true,
    });
    render(<Popup />);

    expect(await screen.findByText('youtube.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove youtube.com' }));

    await waitFor(async () => {
      const data = await chrome.storage.local.get(['restrictedSites']);
      expect(data.restrictedSites).toEqual(['reddit.com']);
    });
    expect(screen.queryByText('youtube.com')).not.toBeInTheDocument();
  });
});
