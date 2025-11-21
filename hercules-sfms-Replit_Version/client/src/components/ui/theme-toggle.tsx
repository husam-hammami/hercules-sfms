import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="bg-slate-800/50 dark:bg-slate-800/50 light:bg-white/90 
                 border-slate-700 dark:border-slate-700 light:border-gray-300 
                 hover:bg-slate-700 dark:hover:bg-slate-700 light:hover:bg-gray-100 
                 text-slate-300 dark:text-slate-300 light:text-gray-700 
                 hover:text-white dark:hover:text-white light:hover:text-gray-900"
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}