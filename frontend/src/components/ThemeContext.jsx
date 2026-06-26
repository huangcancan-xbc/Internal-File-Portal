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
    scan.style.setProperty('--scan-color', dark ? '#3B82F6' : '#60A5FA')
    document.body.appendChild(scan)
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
