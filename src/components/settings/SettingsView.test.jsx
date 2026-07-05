import { render, screen, fireEvent, within } from '@solidjs/testing-library';
import { describe, it, expect, beforeEach } from 'vitest';
import SettingsView from './SettingsView';
import { settingsStore } from '../../stores/settingsStore';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';

describe('SettingsView', () => {
  beforeEach(() => {
    eventStore.setCalendars([]);
    taskStore.setLists([]);
  });

  it('renders the Settings heading and section groups', () => {
    render(() => <SettingsView />);
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Focus & Pomodoro' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Cloud Sync' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Calendars' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Task Lists' })).toBeInTheDocument();
  });

  it('renders boolean preferences as labelled switches wired to the settings store', () => {
    render(() => <SettingsView />);
    const showSeconds = screen.getByRole('switch', { name: 'Show Seconds on Clock' });
    const before = settingsStore.state.showSeconds;
    fireEvent.click(showSeconds);
    expect(settingsStore.state.showSeconds).toBe(!before);
    // restore
    settingsStore.setShowSeconds(before);

    expect(screen.getByRole('switch', { name: 'Dark Mode' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Show Tasks in Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Use 24-Hour Clock' })).toBeInTheDocument();
  });

  it('renders choice preferences as labelled selectors', () => {
    render(() => <SettingsView />);
    expect(screen.getByRole('combobox', { name: /start of week/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /weather units/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /focus duration/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /rest duration/i })).toBeInTheDocument();
  });

  it('changes the week start through the Start of Week selector', () => {
    render(() => <SettingsView />);
    const original = settingsStore.state.startOfWeek;
    const trigger = screen.getByRole('combobox', { name: /start of week/i });
    fireEvent.click(trigger.closest('.astryx-selector'));
    const target = original === 'sunday' ? 'Monday' : 'Sunday';
    fireEvent.click(screen.getByRole('option', { name: target }));
    expect(settingsStore.state.startOfWeek).toBe(target.toLowerCase());
    // restore
    settingsStore.setStartOfWeek(original);
  });

  it('exposes the theme swatches as a radiogroup with one radio per theme', () => {
    render(() => <SettingsView />);
    const group = screen.getByRole('radiogroup', { name: 'Theme Color' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(6);
    expect(within(group).getByRole('radio', { name: 'Rose' })).toBeInTheDocument();
  });

  it('shows empty states when no calendars or lists exist', () => {
    render(() => <SettingsView />);
    expect(screen.getByText('No local calendars found.')).toBeInTheDocument();
    expect(screen.getByText('No cloud calendars synced.')).toBeInTheDocument();
    expect(screen.getByText('No local lists found.')).toBeInTheDocument();
    expect(screen.getByText('No cloud lists synced.')).toBeInTheDocument();
  });

  it('renders local calendars as list rows with a destructive delete action', () => {
    eventStore.setCalendars([
      { id: 'cal-1', name: 'Personal', color: '#3B6ED6' },
      { id: 'cal-2', name: 'Work', color: '#1FA7A7', provider: 'google' },
    ]);
    render(() => <SettingsView />);

    const localList = screen.getByRole('list', { name: 'Local calendars' });
    expect(within(localList).getByDisplayValue('Personal')).toBeInTheDocument();
    expect(
      within(localList).getByRole('button', { name: 'Delete calendar: Personal' }),
    ).toBeInTheDocument();

    // Cloud calendars are read-only rows with a provider badge.
    const cloudList = screen.getByRole('list', { name: 'Cloud synced calendars' });
    expect(within(cloudList).getByText('Work')).toBeInTheDocument();
    expect(within(cloudList).getByText('google')).toBeInTheDocument();
  });

  it('renders task lists with add buttons for local lists', () => {
    taskStore.setLists([{ id: 'list-1', name: 'Chores', color: '#E8942A' }]);
    render(() => <SettingsView />);
    const localList = screen.getByRole('list', { name: 'Local task lists' });
    expect(within(localList).getByDisplayValue('Chores')).toBeInTheDocument();
    expect(
      within(localList).getByRole('button', { name: 'Delete list: Chores' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '+ New' })).toHaveLength(2);
  });

  it('offers cloud sync connect actions', () => {
    render(() => <SettingsView />);
    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Google Calendar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Microsoft Outlook' })).toBeInTheDocument();
  });
});
