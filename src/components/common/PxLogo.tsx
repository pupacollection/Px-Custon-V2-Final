import React from 'react';

interface PxLogoProps {
  className?: string;
  variant?: 'default' | 'control' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const PxLogo: React.FC<PxLogoProps> = ({
  className = '',
  variant = 'default',
  size = 'md',
}) => {
  // Dimension presets
  const sizeMap = {
    sm: { height: 28, width: variant === 'control' ? 140 : variant === 'icon-only' ? 32 : 110 },
    md: { height: 40, width: variant === 'control' ? 180 : variant === 'icon-only' ? 44 : 150 },
    lg: { height: 56, width: variant === 'control' ? 240 : variant === 'icon-only' ? 64 : 200 },
    xl: { height: 72, width: variant === 'control' ? 300 : variant === 'icon-only' ? 80 : 260 },
  };

  const { height } = sizeMap[size];

  if (variant === 'control') {
    return (
      <div className={`inline-flex items-center gap-2 select-none ${className}`}>
        {/* PX Emblem with Control */}
        <svg
          height={height}
          viewBox="0 0 260 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          {/* Emblem crescent */}
          <g transform="translate(0, 5) scale(0.68)">
            <path
              d="M 28 8 C 16 18, 8 36, 8 56 C 8 80, 22 100, 38 108 C 35 104, 32 98, 30 90 C 26 86, 22 72, 22 56 C 22 38, 32 22, 42 12 Z"
              fill="#FFFFFF"
            />
            <path
              d="M 40 5 C 50 12, 60 25, 62 44 C 56 28, 48 16, 36 10 C 33 22, 32 44, 36 66 C 40 90, 52 104, 65 110 C 55 108, 44 98, 38 84 C 32 66, 31 42, 35 20 Z"
              fill="#FFFFFF"
            />
            {/* Letter P */}
            <path
              d="M 58 35 L 82 35 C 94 35, 100 42, 100 52 C 100 62, 92 68, 80 68 L 70 68 L 70 96 L 58 96 Z M 70 45 L 70 58 L 80 58 C 86 58, 88 55, 88 52 C 88 48, 86 45, 80 45 Z"
              fill="#FFFFFF"
            />
            {/* Letter X with arrowhead */}
            <polygon points="98,42 110,42 138,96 124,96" fill="#FF1A2D" />
            <polygon points="128,42 142,42 112,92 102,92" fill="#FF1A2D" />
            <path d="M 112,90 L 88,102 L 98,74 L 104,84 L 115,66 L 122,72 Z" fill="#FF1A2D" />
            {/* Red Pulse line */}
            <path
              d="M 50 85 L 120 85 L 126 72 L 132 98 L 138 72 L 144 98 L 150 78 L 154 90 L 158 85 L 178 85"
              stroke="#FF1A2D"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="miter"
              fill="none"
            />
          </g>

          {/* CONTROL Badge / Typography */}
          <g transform="translate(130, 24)">
            <text
              x="0"
              y="22"
              fill="#FFFFFF"
              fontFamily="Montserrat, 'Impact', sans-serif"
              fontWeight="900"
              fontSize="24"
              letterSpacing="2"
            >
              CONTROL
            </text>
            <rect x="0" y="28" width="110" height="3" fill="#FF1A2D" rx="1.5" />
          </g>
        </svg>
      </div>
    );
  }

  if (variant === 'icon-only') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <svg
          height={height}
          viewBox="0 0 160 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Emblem crescent */}
          <g transform="translate(10, 10)">
            <path
              d="M 35 10 C 20 22, 10 44, 10 70 C 10 100, 26 125, 48 135 C 44 130, 40 122, 38 112 C 32 106, 28 90, 28 70 C 28 48, 40 28, 52 15 Z"
              fill="#FFFFFF"
            />
            <path
              d="M 50 6 C 62 15, 75 32, 78 55 C 70 35, 60 20, 45 12 C 42 28, 40 55, 45 82 C 50 112, 65 130, 82 138 C 70 135, 56 122, 48 105 C 40 82, 39 52, 44 25 Z"
              fill="#FFFFFF"
            />
            {/* Letter P */}
            <path
              d="M 72 44 L 102 44 C 117 44, 125 53, 125 65 C 125 78, 115 85, 100 85 L 87 85 L 87 120 L 72 120 Z M 87 56 L 87 72 L 100 72 C 107 72, 110 68, 110 65 C 110 60, 107 56, 100 56 Z"
              fill="#FFFFFF"
            />
            {/* Letter X with arrowhead */}
            <polygon points="122,52 138,52 172,120 156,120" fill="#FF1A2D" />
            <polygon points="160,52 176,52 138,115 126,115" fill="#FF1A2D" />
            <path d="M 138,112 L 110,126 L 122,92 L 128,104 L 142,82 L 150,88 Z" fill="#FF1A2D" />
            {/* Pulse line */}
            <path
              d="M 64 106 L 150 106 L 158 90 L 165 122 L 172 90 L 180 122 L 187 97 L 192 112 L 197 106 L 220 106"
              stroke="#FF1A2D"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </svg>
      </div>
    );
  }

  // Default: Full official PX CUSTOM logo
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg
        height={height}
        viewBox="0 0 320 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-auto"
      >
        <g transform="translate(10, 10)">
          {/* 1. Outer crescent curve */}
          <path
            d="M 28 8 
               C 16 20, 8 40, 8 62 
               C 8 90, 22 112, 42 122 
               C 38 116, 34 108, 32 100 
               C 27 94, 23 80, 23 62 
               C 23 42, 33 24, 44 12 Z"
            fill="#FFFFFF"
          />
          {/* Inner crescent curve */}
          <path
            d="M 42 5 
               C 54 13, 66 28, 68 48 
               C 62 30, 52 17, 39 11 
               C 36 24, 35 48, 39 72 
               C 44 98, 56 114, 70 120 
               C 59 118, 47 106, 41 92 
               C 34 72, 33 46, 37 22 Z"
            fill="#FFFFFF"
          />
          {/* Bottom aerodynamic notch */}
          <path
            d="M 26 102 C 32 114, 42 124, 56 128 C 47 126, 38 120, 32 110 Z"
            fill="#FFFFFF"
          />

          {/* 2. Bold Letter P in distressed white */}
          <path
            d="M 64 38 
               L 92 38 
               C 106 38, 114 46, 114 58 
               C 114 70, 104 77, 90 77 
               L 77 77 
               L 77 108 
               L 64 108 Z 
               M 77 48 
               L 77 66 
               L 90 66 
               C 96 66, 100 63, 100 58 
               C 100 52, 96 48, 90 48 Z"
            fill="#FFFFFF"
          />

          {/* 3. Bold Letter X in vivid intense Red #FF1A2D with Arrowhead */}
          <polygon points="108,46 122,46 154,106 140,106" fill="#FF1A2D" />
          <polygon points="144,46 158,46 124,102 113,102" fill="#FF1A2D" />
          {/* Arrow tip at bottom-left */}
          <path
            d="M 124 100 
               L 98 110 
               L 108 82 
               L 114 92 
               L 126 73 
               L 134 78 Z"
            fill="#FF1A2D"
          />

          {/* 4. Red Horizontal Pulse / Heartbeat Line */}
          <path
            d="M 58 94 
               L 132 94 
               L 139 78 
               L 145 110 
               L 152 78 
               L 158 110 
               L 165 85 
               L 169 100 
               L 173 94 
               L 205 94"
            stroke="#FF1A2D"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="miter"
            fill="none"
          />

          {/* 5. Word "CUSTOM" in distressed bold uppercase */}
          <text
            x="120"
            y="126"
            fontFamily="Montserrat, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="21"
            letterSpacing="3"
            fill="#FFFFFF"
          >
            CUSTOM
          </text>
        </g>
      </svg>
    </div>
  );
};
