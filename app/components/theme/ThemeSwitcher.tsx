import { useState, useEffect } from 'react';
import { SunIcon, MoonIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

type Theme = 'light' | 'dark' | 'violet-night';

interface ThemeSwitcherProps {
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className = '' }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('dark');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load theme from localStorage or system preference
    const stored = localStorage.getItem('bolt-theme') as Theme;
    if (stored && ['light', 'dark', 'violet-night'].includes(stored)) {
      setCurrentTheme(stored);
      applyTheme(stored);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultTheme = prefersDark ? 'dark' : 'light';
      setCurrentTheme(defaultTheme);
      applyTheme(defaultTheme);
    }
  }, []);

  const applyTheme = (theme: Theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    
    // For violet night mode, add additional class for enhanced styling
    if (theme === 'violet-night') {
      document.documentElement.classList.add('violet-night-mode');
    } else {
      document.documentElement.classList.remove('violet-night-mode');
    }
  };

  const handleThemeChange = (theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem('bolt-theme', theme);
    setIsOpen(false);
  };

  const themes: { id: Theme; label: string; icon: React.ReactNode; description: string }[] = [
    {
      id: 'light',
      label: 'Light',
      icon: <SunIcon className="w-4 h-4" />,
      description: 'Clean and bright interface'
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <MoonIcon className="w-4 h-4" />,
      description: 'Easy on the eyes'
    },
    {
      id: 'violet-night',
      label: 'Violet Night',
      icon: <SparklesIcon className="w-4 h-4" />,
      description: 'Purple themed dark mode'
    }
  ];

  const getCurrentThemeData = () => themes.find(t => t.id === currentTheme)!;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
          currentTheme === 'violet-night'
            ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30'
            : 'bg-bolt-elements-button-secondary-background border border-bolt-elements-borderColor text-bolt-elements-button-secondary-text hover:bg-bolt-elements-button-secondary-backgroundHover'
        }`}
        title="Change theme"
      >
        {getCurrentThemeData().icon}
        <span className="text-sm font-medium">{getCurrentThemeData().label}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full mt-2 right-0 z-50 min-w-[240px] rounded-lg border shadow-lg ${
              currentTheme === 'violet-night'
                ? 'bg-background-input border-background-border shadow-violet-500/20'
                : 'bg-bolt-elements-background-depth-1 border-bolt-elements-borderColor'
            }`}
          >
            <div className="p-2">
              <div className="text-xs font-medium text-bolt-elements-textSecondary mb-2 px-2">
                Choose Theme
              </div>
              
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all ${
                    currentTheme === theme.id
                      ? currentTheme === 'violet-night'
                        ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                        : 'bg-bolt-elements-item-backgroundActive text-bolt-elements-item-contentActive'
                      : currentTheme === 'violet-night'
                        ? 'text-text-secondary hover:bg-background-border/50 hover:text-text-main'
                        : 'text-bolt-elements-textSecondary hover:bg-bolt-elements-item-backgroundActive hover:text-bolt-elements-textPrimary'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-md ${
                    theme.id === 'light' 
                      ? 'bg-yellow-100 text-yellow-600'
                      : theme.id === 'dark'
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-violet-600/20 text-violet-400'
                  }`}>
                    {theme.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-sm">{theme.label}</div>
                    <div className="text-xs opacity-70">{theme.description}</div>
                  </div>
                  
                  {currentTheme === theme.id && (
                    <div className={`w-2 h-2 rounded-full ${
                      theme.id === 'violet-night' ? 'bg-violet-400' : 'bg-bolt-elements-item-contentAccent'
                    }`} />
                  )}
                </button>
              ))}
            </div>

            {/* Preview Section */}
            <div className={`border-t p-3 ${
              currentTheme === 'violet-night' 
                ? 'border-background-border' 
                : 'border-bolt-elements-borderColor'
            }`}>
              <div className="text-xs font-medium text-bolt-elements-textSecondary mb-2">
                Theme Preview
              </div>
              <div className={`rounded-md p-3 border ${
                currentTheme === 'violet-night'
                  ? 'bg-background-primary border-background-border'
                  : 'bg-bolt-elements-background-depth-2 border-bolt-elements-borderColor'
              }`}>
                <div className={`text-sm font-medium mb-1 ${
                  currentTheme === 'violet-night' 
                    ? 'text-text-main' 
                    : 'text-bolt-elements-textPrimary'
                }`}>
                  Sample Interface
                </div>
                <div className={`text-xs ${
                  currentTheme === 'violet-night' 
                    ? 'text-text-secondary' 
                    : 'text-bolt-elements-textSecondary'
                }`}>
                  This is how your interface will look
                </div>
                <div className="flex gap-2 mt-2">
                  <div className={`w-3 h-3 rounded ${
                    currentTheme === 'violet-night' ? 'bg-violet-500' : 'bg-bolt-elements-item-contentAccent'
                  }`} />
                  <div className={`w-3 h-3 rounded ${
                    currentTheme === 'violet-night' ? 'bg-background-border' : 'bg-bolt-elements-borderColor'
                  }`} />
                  <div className={`w-3 h-3 rounded ${
                    currentTheme === 'violet-night' ? 'bg-text-secondary' : 'bg-bolt-elements-textSecondary'
                  }`} />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

// Additional utility component for theme-aware elements
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return <>{children}</>;
};

// Hook for accessing current theme
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const updateTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') as Theme || 'dark';
      setTheme(currentTheme);
    };

    updateTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      updateTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  return {
    theme,
    isVioletNight: theme === 'violet-night',
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };
};

// Auto theme initialization script (can be added to root layout)
export const ThemeScript = () => {
  const script = `
    (function() {
      try {
        const stored = localStorage.getItem('bolt-theme');
        if (stored && ['light', 'dark', 'violet-night'].includes(stored)) {
          document.documentElement.setAttribute('data-theme', stored);
          if (stored === 'violet-night') {
            document.documentElement.classList.add('violet-night-mode');
          }
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const defaultTheme = prefersDark ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', defaultTheme);
        }
      } catch (e) {
        console.warn('Theme initialization error:', e);
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
};