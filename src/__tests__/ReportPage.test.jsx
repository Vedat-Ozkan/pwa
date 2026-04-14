import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReportPage from '../pages/ReportPage.jsx'
import { LEAK_SOURCES } from '../lib/constants.js'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/supabase.js', () => ({
  isConfigured: true,
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://x.co/img.jpg' } })),
        remove: vi.fn(() => Promise.resolve({})),
      })),
    },
  },
}))

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file) => file),
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => children,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => children,
  rectSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  arrayMove: (arr, from, to) => {
    const result = [...arr]
    const [removed] = result.splice(from, 1)
    result.splice(to, 0, removed)
    return result
  },
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}))

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToWindowEdges: vi.fn(),
}))

vi.mock('../components/ReportPDFPreview.jsx', () => ({
  default: () => <div data-testid="pdf-preview-stub">PDF Preview</div>,
}))

// ── Helpers ──────────────────────────────────────────────────────────────────
import { supabase } from '../lib/supabase.js'

const CLIENT = {
  id: 'c1', name: 'Acme Corp', building: 'HQ',
  address: '1 Main St', billing: '', contact: 'Bob', phone: '555', email: 'b@t.com',
}

function makeClientChain(data = null, error = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data, error })),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
  }
}

function renderNewReport() {
  return render(
    <MemoryRouter initialEntries={['/clients/c1/reports/new']}>
      <Routes>
        <Route path="/clients/:clientId/reports/new" element={<ReportPage />} />
        <Route path="/clients/:clientId/reports/:reportId" element={<ReportPage />} />
        <Route path="/clients/:clientId" element={<div>Client Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('ReportPage — new report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    supabase.from.mockReturnValue(makeClientChain(CLIENT))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders all main form sections', async () => {
    renderNewReport()
    await waitFor(() => expect(screen.getByText('Project Information')).toBeInTheDocument())
    expect(screen.getByText('Roof System')).toBeInTheDocument()
    expect(screen.getByText('Leak Source')).toBeInTheDocument()
    expect(screen.getByText('Work Description')).toBeInTheDocument()
    expect(screen.getByText('Photo Documentation')).toBeInTheDocument()
    expect(screen.getByText('Signature')).toBeInTheDocument()
  })

  it('defaults report date to today in local time (YYYY-MM-DD)', async () => {
    renderNewReport()
    await waitFor(() => screen.getByText('Project Information'))
    // Build today's local date string the same way localToday() does
    const d = new Date()
    const expected = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
    // The date input is not label-associated via htmlFor, so query by type
    const dateInput = document.querySelector('input[type="date"]')
    expect(dateInput).not.toBeNull()
    expect(dateInput.value).toBe(expected)
  })

  it('shows all 19 leak source checkboxes', async () => {
    renderNewReport()
    await waitFor(() => screen.getByText('Leak Source'))
    expect(screen.getAllByRole('checkbox')).toHaveLength(LEAK_SOURCES.length)
  })

  it('toggles a leak source on and off', async () => {
    renderNewReport()
    await waitFor(() => screen.getByText('Drain'))
    const checkbox = within(screen.getByText('Drain').closest('label')).getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
    await userEvent.setup().click(checkbox)
    expect(checkbox).toBeChecked()
    await userEvent.setup().click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('multiple leak sources are independent', async () => {
    renderNewReport()
    await waitFor(() => screen.getByText('Leak Source'))
    const user = userEvent.setup()
    const drainCb = within(screen.getByText('Drain').closest('label')).getByRole('checkbox')
    const skylightCb = within(screen.getByText('Skylight').closest('label')).getByRole('checkbox')
    await user.click(drainCb)
    await user.click(skylightCb)
    expect(drainCb).toBeChecked()
    expect(skylightCb).toBeChecked()
    await user.click(drainCb)
    expect(drainCb).not.toBeChecked()
    expect(skylightCb).toBeChecked()
  })

  it('shows client name in topbar', async () => {
    renderNewReport()
    await waitFor(() => expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument())
  })

  it('shows italic signature preview when name is entered', async () => {
    renderNewReport()
    await waitFor(() => screen.getByText('Signature'))
    await userEvent.setup().type(screen.getByPlaceholderText(/full name.*signature/i), 'John Smith')
    expect(screen.getByText('SIGNATURE PREVIEW')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('PDF section shows preview button initially', async () => {
    renderNewReport()
    await waitFor(() => screen.getByText('PDF'))
    expect(screen.getByText(/Preview.*Download PDF/i)).toBeInTheDocument()
  })

  it('loads PDF preview component on demand', async () => {
    renderNewReport()
    await waitFor(() => screen.getByText(/Preview.*Download PDF/i))
    await act(async () => {
      await userEvent.setup().click(screen.getByText(/Preview.*Download PDF/i))
    })
    await waitFor(() => screen.getByTestId('pdf-preview-stub'))
  })
})

describe('ReportPage — photo sections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.from.mockReturnValue(makeClientChain(CLIENT))
  })

  it('renders Before, Progress, After headers', async () => {
    renderNewReport()
    await waitFor(() => screen.getByText('Before'))
    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
  })

  it('each photo group has an Add Photos button', async () => {
    renderNewReport()
    await waitFor(() => screen.getAllByText(/Add.*Photos/i))
    expect(screen.getAllByText(/Add.*Photos/i)).toHaveLength(3)
  })

  it('opens bottom sheet when Add Photos is clicked', async () => {
    renderNewReport()
    await waitFor(() => screen.getAllByText(/Add.*Photos/i))
    await userEvent.setup().click(screen.getAllByText(/Add.*Photos/i)[0])
    expect(screen.getByText('Take Photo')).toBeInTheDocument()
    expect(screen.getByText('Choose from Gallery')).toBeInTheDocument()
  })

  it('dismisses bottom sheet on Cancel', async () => {
    renderNewReport()
    await waitFor(() => screen.getAllByText(/Add.*Photos/i))
    const user = userEvent.setup()
    await user.click(screen.getAllByText(/Add.*Photos/i)[0])
    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Take Photo')).not.toBeInTheDocument()
  })
})
