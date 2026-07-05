/**
 * ArchiveView (Phase 4 kit migration) — characterization tests pinning the
 * NEW intended markup/behavior: kit Heading page/group titles, a
 * SegmentedControl filter (radiogroup), edge-to-edge List/ListItem rows,
 * an origin Token per row, a MoreMenu with restore/delete actions wired to
 * the existing store APIs, and the kit EmptyState when there is no data.
 * Queries by role/label/text only.
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import ArchiveView from './ArchiveView';
import { taskStore } from '../../stores/taskStore';
import { eventStore } from '../../stores/eventStore';

vi.mock('../../stores/syncEngine', () => ({
  syncEngine: { enqueue: vi.fn() },
}));

// Dates safely in the past relative to the suite's runtime.
const PAST_START = '2026-01-15T10:00:00Z';
const PAST_END = '2026-01-15T11:00:00Z';

function seedArchive() {
  taskStore.setLists([{ id: 'list-1', name: 'Chores', color: '#8b5cf6' }]);
  taskStore.setTasks([
    {
      id: 'task-1',
      title: 'Water plants',
      listId: 'list-1',
      completed: true,
      updated_at: '2026-02-03T09:00:00Z',
    },
    { id: 'task-2', title: 'Open task', listId: 'list-1', completed: false },
  ]);
  eventStore.setCalendars([{ id: 'cal-1', name: 'Work', color: '#0ea5e9' }]);
  eventStore.setEvents([
    {
      id: 'event-1',
      title: 'Kickoff meeting',
      calendarId: 'cal-1',
      start_time: PAST_START,
      end_time: PAST_END,
    },
  ]);
}

beforeEach(() => {
  taskStore.setTasks([]);
  taskStore.setLists([]);
  eventStore.setEvents([]);
  eventStore.setCalendars([]);
});

describe('ArchiveView', () => {
  test('renders the page heading and month group headings as real headings', () => {
    seedArchive();
    render(() => <ArchiveView />);
    expect(screen.getByRole('heading', { level: 1, name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'February 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'January 2026' })).toBeInTheDocument();
  });

  test('shows archived items as list rows with type/date meta and origin token', () => {
    seedArchive();
    render(() => <ArchiveView />);
    expect(screen.getAllByRole('list').length).toBeGreaterThan(0);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2); // completed task + past event, not the open task
    expect(screen.getByText('Water plants')).toBeInTheDocument();
    expect(screen.getByText('Kickoff meeting')).toBeInTheDocument();
    expect(screen.getByText(/Completed Task • Feb 3/)).toBeInTheDocument();
    expect(screen.getByText(/Event • Jan 15/)).toBeInTheDocument();
    // Origin tokens carry the source list/calendar name
    expect(screen.getByText('Chores')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  test('filter is a radiogroup that narrows the archive to events or tasks', async () => {
    seedArchive();
    render(() => <ArchiveView />);
    const group = screen.getByRole('radiogroup', { name: 'Filter archive' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Events' }));
    expect(screen.getByText('Kickoff meeting')).toBeInTheDocument();
    expect(screen.queryByText('Water plants')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Tasks' }));
    expect(screen.getByText('Water plants')).toBeInTheDocument();
    expect(screen.queryByText('Kickoff meeting')).not.toBeInTheDocument();
  });

  test('restore action un-completes the task through taskStore', () => {
    seedArchive();
    render(() => <ArchiveView />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Water plants' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Restore' }));
    expect(taskStore.state.tasks.find(t => t.id === 'task-1').completed).toBe(false);
    // The restored task leaves the archive
    expect(screen.queryByText('Water plants')).not.toBeInTheDocument();
  });

  test('delete action removes the event through eventStore (no restore offered)', () => {
    seedArchive();
    render(() => <ArchiveView />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Kickoff meeting' }));
    expect(screen.queryByRole('menuitem', { name: 'Restore' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(eventStore.state.events).toHaveLength(0);
    expect(screen.queryByText('Kickoff meeting')).not.toBeInTheDocument();
  });

  test('shows the kit EmptyState when the archive is empty', () => {
    render(() => <ArchiveView />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Your archive is empty.');
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
