import { useTheme } from '../../../Contexts/ThemeContext';
import * as Icon from '../../../Imports/icons';
import './Theme_Toggle.scss';

const Theme_Toggle = () => {
  const { isDark, handleDarkMode, handleLightMode } = useTheme();

  const toggle = () => {
    if (isDark) handleLightMode();
    else handleDarkMode();
  };

  return (
    <div className="Theme_Toggle">
      <button type="button" onClick={toggle}>
        {isDark ? <Icon.Sun color="var(--text-soft)" /> : <Icon.Moon color="var(--text-soft)" />}
      </button>
    </div>
  );
};

export default Theme_Toggle;
