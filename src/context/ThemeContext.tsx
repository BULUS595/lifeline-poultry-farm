import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Accent = 'teal' | 'blue' | 'indigo' | 'emerald' | 'rose' | 'amber';
type Density = 'spacious' | 'compact';

interface ThemeContextType {
    theme: Theme;
    accent: Accent;
    density: Density;
    toggleTheme: () => void;
    setAccent: (accent: Accent) => void;
    setDensity: (density: Density) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Theme Preference
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('lifeline-theme');
        if (saved === 'light' || saved === 'dark') return saved;
        return 'dark'; // Defaulting to dark as requested (#121212)
    });

    // Accent Preference
    const [accent, setAccent] = useState<Accent>(() => {
        const saved = localStorage.getItem('lifeline-accent');
        const allowed = ['teal', 'blue', 'indigo', 'emerald', 'rose', 'amber'];
        if (saved && allowed.includes(saved)) return saved as Accent;
        return 'teal'; // Default as requested (#1ABC9C)
    });

    // Density Preference
    const [density, setDensity] = useState<Density>(() => {
        const saved = localStorage.getItem('lifeline-density');
        if (saved === 'spacious' || saved === 'compact') return saved;
        return 'spacious'; // Default as requested "Spacious Layout"
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('lifeline-theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-accent', accent);
        localStorage.setItem('lifeline-accent', accent);
    }, [accent]);

    useEffect(() => {
        document.documentElement.setAttribute('data-density', density);
        localStorage.setItem('lifeline-density', density);
    }, [density]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            accent,
            density,
            toggleTheme,
            setAccent,
            setDensity
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
