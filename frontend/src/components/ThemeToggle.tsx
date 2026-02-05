import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark' || saved === null; // Default to dark
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        document.documentElement.classList.toggle('light', !darkMode);
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    return (
        <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 transition-all duration-200 group"
            aria-label="Toggle theme"
        >
            {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-400 group-hover:rotate-180 transition-transform duration-300" />
            ) : (
                <Moon className="w-5 h-5 text-blue-400 group-hover:-rotate-12 transition-transform duration-300" />
            )}
        </button>
    );
}
