import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ClientsPage from '../pages/ClientsPage.jsx'

vi.mock('../lib/supabase.js', () => ({
  isConfigured: true,
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase.js'

function makeQuery(data) {
  return {
    select: vi.fn(() => ({
      order: vi.fn(() => Promise.resolve({ data, error: null })),
    })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
  }
}

function renderPage() {
  return render(<MemoryRouter><ClientsPage /></MemoryRouter>)
}

describe('ClientsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows empty state when there are no clients', async () => {
    supabase.from.mockReturnValue(makeQuery([]))
    renderPage()
    await waitFor(() => expect(screen.getByText(/No clients yet/i)).toBeInTheDocument())
  })

  it('renders a card for each client', async () => {
    supabase.from.mockReturnValue(makeQuery([
      { id: '1', name: 'Acme Roofing', building: 'Tower A', address: '123 Main St', created_at: '2026-01-01' },
      { id: '2', name: 'Beta Corp', building: null, address: null, created_at: '2026-01-02' },
    ]))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme Roofing')).toBeInTheDocument()
      expect(screen.getByText('Beta Corp')).toBeInTheDocument()
    })
  })

  it('shows building and address when present', async () => {
    supabase.from.mockReturnValue(makeQuery([
      { id: '1', name: 'Acme', building: 'HQ Tower', address: '1 Bay St', created_at: '2026-01-01' },
    ]))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('HQ Tower')).toBeInTheDocument()
      expect(screen.getByText('1 Bay St')).toBeInTheDocument()
    })
  })

  it('opens New Client modal when button is clicked', async () => {
    supabase.from.mockReturnValue(makeQuery([]))
    renderPage()
    await waitFor(() => screen.getByText(/No clients yet/i))
    // Use getByRole to avoid ambiguity with any matching text
    await userEvent.setup().click(screen.getByRole('button', { name: /new client/i }))
    expect(screen.getByText('New Client')).toBeInTheDocument()
  })

  it('closes modal on Cancel', async () => {
    supabase.from.mockReturnValue(makeQuery([]))
    renderPage()
    await waitFor(() => screen.getByText(/No clients yet/i))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText('New Client')).not.toBeInTheDocument()
  })

  it('creates a client and refreshes the list', async () => {
    let calls = 0
    supabase.from.mockImplementation(() => {
      if (calls++ === 0) return makeQuery([])
      return makeQuery([
        { id: 'new-1', name: 'Fresh Client', building: null, address: null, created_at: '2026-04-14' },
      ])
    })

    renderPage()
    await waitFor(() => screen.getByText(/No clients yet/i))

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /new client/i }))
    await user.type(screen.getByPlaceholderText(/milestone property management/i), 'Fresh Client')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(screen.getByText('Fresh Client')).toBeInTheDocument())
  })
})
