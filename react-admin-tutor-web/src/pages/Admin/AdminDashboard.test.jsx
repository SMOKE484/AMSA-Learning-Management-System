import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import api from '../../services/apiService';

vi.mock('../../services/apiService', () => ({
  default: { get: vi.fn() },
}));

const makeStudents = (n) => Array.from({ length: n }, (_, i) => ({ _id: `s${i}` }));
const makeTutors = (n) => Array.from({ length: n }, (_, i) => ({ _id: `t${i}` }));

// A single schedules "page" that never reflects the true total on its own —
// stands in for the DB having more rows than any one page returns.
const schedulesPage = (pageItems, total) => ({
  data: {
    schedules: pageItems,
    pagination: { page: 1, limit: pageItems.length, total },
  },
});

const mockApiGet = ({ students = 0, tutors = 0, scheduleTotal = 0, todayTotal = 0 } = {}) => {
  api.get.mockImplementation((url, config) => {
    if (url === '/admin/students') return Promise.resolve({ data: { students: makeStudents(students) } });
    if (url === '/admin/tutors') return Promise.resolve({ data: { tutors: makeTutors(tutors) } });
    if (url === '/schedules') {
      const params = config?.params || {};
      if (params.startDate || params.endDate) {
        // Today-filtered request: only the classes matching today's date.
        return Promise.resolve(schedulesPage([], todayTotal));
      }
      // Unfiltered request: backend paginates, so the returned page is
      // intentionally smaller than the true total to prove the component
      // doesn't rely on schedules.length for the "Total Classes" count.
      const pageSize = Math.min(10, scheduleTotal);
      return Promise.resolve(schedulesPage(Array.from({ length: pageSize }, (_, i) => ({ _id: `c${i}` })), scheduleTotal));
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );

describe('AdminDashboard stats', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('shows the true total class count from the backend, not the length of one paginated page', async () => {
    // 25 schedules exist in the DB, but the default schedules page only returns 10.
    mockApiGet({ students: 176, tutors: 7, scheduleTotal: 25, todayTotal: 0 });
    renderDashboard();

    await waitFor(() => expect(screen.getByText('176')).toBeInTheDocument());
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });

  it("computes Today's Classes from a backend-filtered total, not by scanning the truncated page", async () => {
    // Today's classes (3) exist beyond what the oldest-sorted default page would contain.
    mockApiGet({ students: 5, tutors: 2, scheduleTotal: 25, todayTotal: 3 });
    renderDashboard();

    await waitFor(() => expect(screen.getByText('25')).toBeInTheDocument());
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders all-zero stats for a brand new school with no data, without crashing', async () => {
    mockApiGet({ students: 0, tutors: 0, scheduleTotal: 0, todayTotal: 0 });
    renderDashboard();

    await waitFor(() => expect(screen.getAllByText('0').length).toBeGreaterThan(0));
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('degrades gracefully (no crash, stops loading) when the stats request fails', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/schedules') return Promise.reject(new Error('network error'));
      if (url === '/admin/students') return Promise.resolve({ data: { students: makeStudents(5) } });
      if (url === '/admin/tutors') return Promise.resolve({ data: { tutors: makeTutors(2) } });
      return Promise.reject(new Error('unexpected'));
    });
    renderDashboard();

    await waitFor(() => expect(screen.getByText('Admin Dashboard')).toBeInTheDocument());
    // Falls back to zeroed stats rather than hanging on the loading spinner or crashing.
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});
