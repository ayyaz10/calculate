import { useTheme } from '../../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <label className="theme-toggle inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#fffdf8] px-3 py-1.5 shadow-[3px_3px_0_#000]">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-black/65">
        Theme
      </span>
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value)}
        className="theme-select rounded-full border-2 border-black bg-[#c5ff6f] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black outline-none"
        aria-label="Select app theme"
      >
        <option value="original">Original</option>
        <option value="matrix">Matrix</option>
      </select>
    </label>
  );
}
