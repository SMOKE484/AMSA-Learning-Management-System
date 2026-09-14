import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageSchedules from './ManageSchedules';
import api from '../../services/apiService';
import { SnackbarProvider } from '../../context/SnackbarContext';

vi.mock('../../services/apiService', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const TUTOR = { _id: 't1', user: { name: 'Tutor One' } };
const ACADEMIC_CONFIG = { subjects: ['Mathematics', 'Physical Sciences'], grades: ['9', '10', '11'] };

const makeSchedule = (id, overrides = {}) => ({
  _id: id,
  title: `Class ${id}`,
  subject: 'Mathematics',
  grade: '10',
  description: 'Revision session',
  status: 'completed',
  scheduledDate: '2026-06-05T00:00:00.000Z',
  startTime: '09:00',
  endTime: '10:00',
  tutor: TUTOR,
  students: [],
  ...overrides,
});

// Mimics the real /schedules endpoint: a status filter narrows the result
// set (and its total), independent of whatever page size is requested.
const mockApiGet = ({ allSchedules, statusTotals }) => {
  api.get.mockImplementation((url, config) => {
    const params = config?.params || {};
    if (url === '/schedules') {
      if (params.status) {
        return Promise.resolve({
          data: { schedules: [], pagination: { total: statusTotals[params.status] ?? 0 } },
        });
      }
      const limit = params.limit ?? 10;
      const page = allSchedules.slice(0, limit);
      return Promise.resolve({
        data: { schedules: page, pagination: { page: 1, limit, total: allSchedules.length } },
      });
    }
    if (url === '/admin/tutors') return Promise.resolve({ data: { tutors: [TUTOR] } });
    if (url === '/admin/students') return Promise.resolve({ data: { students: [] } });
    if (url === '/academic/config') return Promise.resolve({ data: ACADEMIC_CONFIG });
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
};

const renderPage = () =>
  render(
    <SnackbarProvider>
      <ManageSchedules />
    </SnackbarProvider>
  );

describe('ManageSchedules stats', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
  });

  it('shows the true total class count from the backend, not the length of one paginated page', async () => {
    // 25 classes exist; the default schedules page (limit 10) only returns 10 of them.
    const allSchedules = Array.from({ length: 25 }, (_, i) => makeSchedule(`c${i}`));
    mockApiGet({
      allSchedules,
      statusTotals: { scheduled: 4, ongoing: 3, completed: 18 },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('25')).toBeInTheDocument());
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });

  it('computes status breakdown counts from backend totals, not from filtering one truncated page', async () => {
    const allSchedules = Array.from({ length: 25 }, (_, i) => makeSchedule(`c${i}`));
    mockApiGet({
      allSchedules,
      statusTotals: { scheduled: 4, ongoing: 3, completed: 18 },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('Upcoming')).toBeInTheDocument());
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('lists more than 10 classes in the table when more than 10 exist', async () => {
    const allSchedules = Array.from({ length: 15 }, (_, i) => makeSchedule(`c${i}`));
    mockApiGet({
      allSchedules,
      statusTotals: { scheduled: 0, ongoing: 0, completed: 15 },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('Class c14')).toBeInTheDocument());
    const rows = screen.getAllByText(/^Class c\d+$/);
    expect(rows).toHaveLength(15);
  });

  it('shows the empty state and all-zero stats when there are no schedules', async () => {
    mockApiGet({ allSchedules: [], statusTotals: { scheduled: 0, ongoing: 0, completed: 0 } });
    renderPage();

    await waitFor(() => expect(screen.getByText('No Class Schedules')).toBeInTheDocument());
    expect(screen.getAllByText('0')).toHaveLength(4);
  });
});

describe('ManageSchedules class ordering', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
  });

  it('requests the table in newest-first order, so upcoming/scheduled classes surface above a large completed history', async () => {
    const allSchedules = Array.from({ length: 3 }, (_, i) => makeSchedule(`c${i}`));
    mockApiGet({ allSchedules, statusTotals: { scheduled: 1, ongoing: 0, completed: 2 } });
    renderPage();

    await waitFor(() => expect(screen.getByText('Class c0')).toBeInTheDocument());

    const tableCall = api.get.mock.calls.find(
      ([url, config]) => url === '/schedules' && !config?.params?.status
    );
    expect(tableCall[1].params).toMatchObject({ sort: 'desc' });
  });
});

describe('ManageSchedules CRUD (edit)', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
  });

  const setupSingleSchedule = (overrides = {}) => {
    const schedule = makeSchedule('c0', overrides);
    mockApiGet({ allSchedules: [schedule], statusTotals: { scheduled: 0, ongoing: 0, completed: 1 } });
    return schedule;
  };

  it('opens the edit dialog pre-filled with the class\'s existing data', async () => {
    setupSingleSchedule({ status: 'scheduled' });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Class c0')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByText('Edit Class Schedule')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Class c0')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Revision session')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-06-05')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Tutor One')).toBeInTheDocument();
    expect(within(dialog).getByText('Mathematics')).toBeInTheDocument();
    expect(within(dialog).getByText('Grade 10')).toBeInTheDocument();
  });

  it('submits an edit as a PUT to /schedules/:id with the updated fields, then refetches', async () => {
    setupSingleSchedule({ status: 'scheduled' });
    api.put.mockResolvedValue({ data: { message: 'Class updated' } });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Class c0')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /edit/i }));

    const titleInput = screen.getByDisplayValue('Class c0');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    const [url, body] = api.put.mock.calls[0];
    expect(url).toBe('/schedules/c0');
    expect(body).toMatchObject({ title: 'Updated Title', subject: 'Mathematics', grade: '10' });

    // Dialog closes and the list is refetched after a successful save.
    await waitFor(() => expect(screen.queryByText('Edit Class Schedule')).not.toBeInTheDocument());
    expect(api.get.mock.calls.filter(([u, c]) => u === '/schedules' && !c?.params?.status).length).toBeGreaterThan(1);
  });

  it('disables the edit action for a completed class', async () => {
    setupSingleSchedule({ status: 'completed' });
    renderPage();

    await waitFor(() => expect(screen.getByText('Class c0')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
  });

  it('does not fire a second PUT when Save is clicked twice while the first request is in flight', async () => {
    setupSingleSchedule({ status: 'scheduled' });
    let resolvePut;
    api.put.mockReturnValue(new Promise((resolve) => { resolvePut = resolve; }));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Class c0')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /edit/i }));

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    // The button disabling itself (via `disabled={submitting}`) is what stops a
    // real second tap — user-event correctly refuses to click a disabled button.
    expect(saveButton).toBeDisabled();
    // Belt-and-braces: even a raw duplicate click event (e.g. a stray/duplicate
    // event that bypasses the disabled attribute) must not fire a second request.
    fireEvent.click(saveButton);

    expect(api.put).toHaveBeenCalledTimes(1);
    resolvePut({ data: {} });
  });

  it('rejects an edit submission missing a required field without calling the API', async () => {
    setupSingleSchedule({ status: 'scheduled' });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Class c0')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /edit/i }));

    const titleInput = screen.getByDisplayValue('Class c0');
    await user.clear(titleInput);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(api.put).not.toHaveBeenCalled();
    expect(screen.getByText('Edit Class Schedule')).toBeInTheDocument();
  });

  it('keeps the edit dialog open with the entered data if the save fails, so the admin can retry', async () => {
    setupSingleSchedule({ status: 'scheduled' });
    api.put.mockRejectedValue({ response: { status: 409, data: { message: 'Schedule conflict detected' } } });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Class c0')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Edit Class Schedule')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Class c0')).toBeInTheDocument();
  });
});

describe('ManageSchedules search', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
  });

  const setupMixedSchedules = () => {
    const allSchedules = [
      makeSchedule('c0', { title: 'Algebra Revision', subject: 'Mathematics', grade: '10', tutor: { _id: 't1', user: { name: 'Alice Adams' } } }),
      makeSchedule('c1', { title: 'Cell Biology', subject: 'Life Sciences', grade: '11', tutor: { _id: 't2', user: { name: 'Bob Brown' } } }),
      makeSchedule('c2', { title: 'Essay Writing', subject: 'English', grade: '9', tutor: { _id: 't1', user: { name: 'Alice Adams' } } }),
    ];
    mockApiGet({ allSchedules, statusTotals: { scheduled: 1, ongoing: 1, completed: 1 } });
    return allSchedules;
  };

  it('filters the table by class title as the admin types', async () => {
    setupMixedSchedules();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Cell Biology')).toBeInTheDocument());
    await user.type(screen.getByRole('textbox', { name: /search classes/i }), 'algebra');

    expect(screen.getByText('Algebra Revision')).toBeInTheDocument();
    expect(screen.queryByText('Cell Biology')).not.toBeInTheDocument();
    expect(screen.queryByText('Essay Writing')).not.toBeInTheDocument();
  });

  it('matches by tutor name, case-insensitively', async () => {
    setupMixedSchedules();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Cell Biology')).toBeInTheDocument());
    await user.type(screen.getByRole('textbox', { name: /search classes/i }), 'brown');

    expect(screen.getByText('Cell Biology')).toBeInTheDocument();
    expect(screen.queryByText('Algebra Revision')).not.toBeInTheDocument();
    expect(screen.queryByText('Essay Writing')).not.toBeInTheDocument();
  });

  it('matches by subject', async () => {
    setupMixedSchedules();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Cell Biology')).toBeInTheDocument());
    await user.type(screen.getByRole('textbox', { name: /search classes/i }), 'english');

    expect(screen.getByText('Essay Writing')).toBeInTheDocument();
    expect(screen.queryByText('Algebra Revision')).not.toBeInTheDocument();
    expect(screen.queryByText('Cell Biology')).not.toBeInTheDocument();
  });

  it('matches by grade', async () => {
    setupMixedSchedules();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Cell Biology')).toBeInTheDocument());
    await user.type(screen.getByRole('textbox', { name: /search classes/i }), 'grade 11');

    expect(screen.getByText('Cell Biology')).toBeInTheDocument();
    expect(screen.queryByText('Algebra Revision')).not.toBeInTheDocument();
    expect(screen.queryByText('Essay Writing')).not.toBeInTheDocument();
  });

  it('leaves the stat cards showing backend totals, unaffected by the search filter', async () => {
    setupMixedSchedules();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Cell Biology')).toBeInTheDocument());
    await user.type(screen.getByRole('textbox', { name: /search classes/i }), 'algebra');

    // Only 1 of 3 classes is now visible in the table, but "Total Classes" must
    // keep reporting the true backend total, not the filtered row count.
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows a helpful empty state with a way to clear the search when nothing matches', async () => {
    setupMixedSchedules();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Cell Biology')).toBeInTheDocument());
    const searchInput = screen.getByRole('textbox', { name: /search classes/i });
    await user.type(searchInput, 'nonexistent subject');

    expect(screen.getByText(/no classes match/i)).toBeInTheDocument();
    expect(screen.queryByText('Algebra Revision')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear search/i }));

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Algebra Revision')).toBeInTheDocument();
    expect(screen.getByText('Cell Biology')).toBeInTheDocument();
    expect(screen.getByText('Essay Writing')).toBeInTheDocument();
  });

  it('still shows the true "no classes at all" empty state when there is no data, not the search empty state', async () => {
    mockApiGet({ allSchedules: [], statusTotals: { scheduled: 0, ongoing: 0, completed: 0 } });
    renderPage();

    await waitFor(() => expect(screen.getByText('No Class Schedules')).toBeInTheDocument());
    expect(screen.queryByRole('textbox', { name: /search classes/i })).not.toBeInTheDocument();
  });
});
