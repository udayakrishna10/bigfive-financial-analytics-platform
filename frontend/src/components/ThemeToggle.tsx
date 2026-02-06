import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark'; // Default to light mode
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    return (
        <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700 transition-all duration-200 group"
            aria-label="Toggle theme"
        >
            {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-400 group-hover:rotate-180 transition-transform duration-300" />
            ) : (
                <Moon className="w-5 h-5 text-slate-600 dark:text-blue-400 group-hover:-rotate-12 transition-transform duration-300" />
            )}
        </button>
    );
}
