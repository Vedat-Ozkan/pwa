import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientModal from '../components/ClientModal.jsx'

function renderModal(props = {}) {
  const defaults = {
    onSave: vi.fn(),
    onClose: vi.fn(),
    onDelete: undefined,
    initial: null,
  }
  return render(<ClientModal {...defaults} {...props} />)
}

describe('ClientModal', () => {
  it('renders "New Client" title when no initial data', () => {
    renderModal()
    expect(screen.getByText('New Client')).toBeInTheDocument()
  })

  it('renders "Edit Client" title when initial data provided', () => {
    renderModal({ initial: { id: '1', name: 'Acme Corp', building: '', address: '', billing: '', contact: '', phone: '', email: '' } })
    expect(screen.getByText('Edit Client')).toBeInTheDocument()
  })

  it('Save button is disabled when name is empty', () => {
    renderModal()
    expect(screen.getByText('Save')).toBeDisabled()
  })

  it('Save button enables after typing a name', async () => {
    renderModal()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/milestone property management/i), 'Test Client')
    expect(screen.getByText('Save')).toBeEnabled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    await userEvent.setup().click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onSave with form data when Save is clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderModal({ onSave })
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/milestone property management/i), 'HSX Client')
    await user.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'HSX Client' }))
  })

  it('pre-fills all fields from initial data', () => {
    renderModal({
      initial: {
        id: '1', name: 'Milestone', building: 'Tower A',
        address: '123 Main St', billing: '456 Bay St',
        contact: 'John', phone: '416-555-0000', email: 'john@test.com',
      },
    })
    expect(screen.getByDisplayValue('Milestone')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Tower A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
    expect(screen.getByDisplayValue('John')).toBeInTheDocument()
    expect(screen.getByDisplayValue('416-555-0000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john@test.com')).toBeInTheDocument()
  })

  it('shows Delete button only in edit mode', () => {
    const { rerender } = renderModal({ onDelete: vi.fn() })
    // No initial = new mode, no delete even if onDelete is passed
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()

    rerender(
      <ClientModal
        initial={{ id: '1', name: 'X', building: '', address: '', billing: '', contact: '', phone: '', email: '' }}
        onSave={vi.fn()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})
