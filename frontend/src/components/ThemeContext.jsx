import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggle = () => {
    const scan = document.createElement('div')
    scan.className = 'theme-scan-line'
    // Scan colour = target theme's accent (not current)
    const goingDark = !dark
    if (goingDark) {
      scan.style.setProperty('--scan-accent', 'rgba(0,0,0,0.30)')
      scan.style.setProperty('--scan-glow', 'rgba(0,0,0,0.30)')
    } else {
      scan.style.setProperty('--scan-accent', 'rgba(59,130,246,0.12)')
      scan.style.setProperty('--scan-glow', 'rgba(100,160,255,0.25)')
    }
    document.body.appendChild(scan)
    // Toggle after scan passes midpoint
    setTimeout(() => {
      setDark(prev => !prev)
      setTimeout(() => scan.remove(), 2000)
    }, 1200)
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
