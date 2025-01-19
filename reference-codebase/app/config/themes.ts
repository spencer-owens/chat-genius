export interface Theme {
  id: string;
  name: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      background: 'bg-slate-800',
      foreground: 'text-slate-100',
      accent: 'hover:bg-slate-700',
    },
  },
  {
    id: 'blue',
    name: 'Ocean',
    colors: {
      background: 'bg-blue-800',
      foreground: 'text-blue-100',
      accent: 'hover:bg-blue-700',
    },
  },
  {
    id: 'emerald',
    name: 'Forest',
    colors: {
      background: 'bg-emerald-800',
      foreground: 'text-emerald-100',
      accent: 'hover:bg-emerald-700',
    },
  },
  {
    id: 'purple',
    name: 'Royal',
    colors: {
      background: 'bg-purple-800',
      foreground: 'text-purple-100',
      accent: 'hover:bg-purple-700',
    },
  },
  {
    id: 'rose',
    name: 'Ruby',
    colors: {
      background: 'bg-rose-800',
      foreground: 'text-rose-100',
      accent: 'hover:bg-rose-700',
    },
  },
  {
    id: 'amber',
    name: 'Desert',
    colors: {
      background: 'bg-amber-800',
      foreground: 'text-amber-100',
      accent: 'hover:bg-amber-700',
    },
  },
  {
    id: 'zinc',
    name: 'Graphite',
    colors: {
      background: 'bg-zinc-800',
      foreground: 'text-zinc-100',
      accent: 'hover:bg-zinc-700',
    },
  },
] 