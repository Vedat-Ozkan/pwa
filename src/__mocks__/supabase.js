// Reusable Supabase mock — override per-test with vi.mocked() as needed

export const isConfigured = true

const makeChain = (result = { data: [], error: null }) => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (fn) => Promise.resolve(result).then(fn),
  }
  return chain
}

export const supabase = {
  from: vi.fn(() => makeChain()),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.jpg' } })),
      remove: vi.fn(() => Promise.resolve({})),
    })),
  },
}
