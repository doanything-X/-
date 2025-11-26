export enum FilterType {
  NORMAL = 'Normal',
  FUJI = 'Fuji',
  RICOH = 'Ricoh',
  VINTAGE = 'Vintage',
  BW = 'B&W',
  SEPIA = 'Sepia',
  COOL = 'Cool',
  WARM = 'Warm',
  DRAMATIC = 'Dramatic'
}

export interface PhotoData {
  id: string;
  dataUrl: string; // The raw captured image
  caption: string;
  filter: FilterType;
  timestamp: number;
}

export interface FilterConfig {
  name: string;
  class: string; // Tailwind class equivalent for preview
  ctxFilter: string; // Canvas context filter string for export
}

// Map enum to configs
export const FILTERS: Record<FilterType, FilterConfig> = {
  [FilterType.NORMAL]: { 
    name: 'Normal', 
    class: '', 
    ctxFilter: 'none' 
  },
  [FilterType.FUJI]: { 
    name: 'Fuji', 
    class: 'contrast-[1.1] saturate-[1.3] brightness-[1.05] sepia-[0.1] hue-rotate-[-5deg]', 
    ctxFilter: 'contrast(1.1) saturate(1.3) brightness(1.05) sepia(0.1) hue-rotate(-5deg)' 
  },
  [FilterType.RICOH]: { 
    name: 'Ricoh', 
    class: 'grayscale contrast-[1.6] brightness-[0.9] sepia-[0.1]', 
    ctxFilter: 'grayscale(1) contrast(1.6) brightness(0.9) sepia(0.1)' 
  },
  [FilterType.VINTAGE]: { 
    name: 'Vintage', 
    class: 'sepia-[.3] contrast-[1.1] brightness-[1.1] saturate-[0.8]', 
    ctxFilter: 'sepia(0.3) contrast(1.1) brightness(1.1) saturate(0.8)' 
  },
  [FilterType.BW]: { 
    name: 'B&W', 
    class: 'grayscale contrast-[1.2]', 
    ctxFilter: 'grayscale(1) contrast(1.2)' 
  },
  [FilterType.SEPIA]: { 
    name: 'Sepia', 
    class: 'sepia contrast-[0.9] brightness-[0.9]', 
    ctxFilter: 'sepia(1) contrast(0.9) brightness(0.9)' 
  },
  [FilterType.COOL]: { 
    name: 'Cool', 
    class: 'hue-rotate-15 contrast-[1.1] saturate-[0.8]', 
    ctxFilter: 'hue-rotate(15deg) contrast(1.1) saturate(0.8)' 
  },
  [FilterType.WARM]: { 
    name: 'Warm', 
    class: 'sepia-[.2] hue-rotate-[-10deg] saturate-[1.2]', 
    ctxFilter: 'sepia(0.2) hue-rotate(-10deg) saturate(1.2)' 
  },
  [FilterType.DRAMATIC]: { 
    name: 'Dramatic', 
    class: 'contrast-[1.5] saturate-[1.1] brightness-[0.9]', 
    ctxFilter: 'contrast(1.5) saturate(1.1) brightness(0.9)' 
  },
};