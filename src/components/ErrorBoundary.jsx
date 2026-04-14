import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '16px', background: '#fee4e2', borderRadius: 10,
          fontSize: 14, color: '#b42318',
        }}>
          {this.props.fallback ?? 'Something went wrong loading this section.'}
        </div>
      )
    }
    return this.props.children
  }
}
