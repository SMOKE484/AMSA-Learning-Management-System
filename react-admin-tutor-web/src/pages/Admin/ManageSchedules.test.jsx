import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ManageSchedules from './ManageSchedules';
import api from '../../services/apiService';
import { SnackbarProvider } from '../../context/SnackbarContext';

vi.mock('../../services/apiService', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const makeSchedule = (id, overrides = {}) => ({
  _id: id,
  title: `Class ${id}`,
  subject: 'Mathematics',
  grade: '10',
  status: 'completed',
  scheduledDate: '2026-06-05T00:00:00.000Z',
  startTime: '09:00',
  endTime: '10:00',
  tutor: { user: { name: 'Tutor One' } },
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
    if (url === '/admin/tutors') return Promise.resolve({ data: { tutors: [] } });
    if (url === '/admin/students') return Promise.resolve({ data: { students: [] } });
    if (url === '/academic/config') return Promise.resolve({ data: { subjects: [], grades: [] } });
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
