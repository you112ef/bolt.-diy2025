import { useStore } from '@nanostores/react';
import { memo, useEffect, useState } from 'react';
import { themeStore, toggleTheme } from '~/lib/stores/theme';
import { IconButton } from './IconButton';

interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch = memo(({ className }: ThemeSwitchProps) => {
  const theme = useStore(themeStore);
  const [domLoaded, setDomLoaded] = useState(false);

  useEffect(() => {
    setDomLoaded(true);
  }, []);

  return (
    domLoaded && (
      <IconButton
        className={className}
        icon={
          theme === 'light'
            ? 'i-ph-moon-stars-duotone' // Moon icon to switch to Dark mode
            : theme === 'dark'
              ? 'i-ph:paint-brush-broad-duotone' // OLED/Paint icon to switch to OLED mode
              : 'i-ph-sun-dim-duotone' // Sun icon to switch to Light mode
        }
        size="xl"
        title="Toggle Theme"
        onClick={toggleTheme}
      />
    )
  );
});
