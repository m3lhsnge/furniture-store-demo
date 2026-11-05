import type { MouseEvent } from 'react'

export function navigate(path: string) {
  if (window.location.pathname + window.location.search + window.location.hash !== path) {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  window.scrollTo({ top: 0 })
}

export function homeClick(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  navigate('/')
}
