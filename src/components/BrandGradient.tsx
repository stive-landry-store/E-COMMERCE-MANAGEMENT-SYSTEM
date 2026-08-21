export function BrandGradientDefs() {
  return (
    <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff7a45" />
          <stop offset="48%" stopColor="#ff2d95" />
          <stop offset="100%" stopColor="#c026d3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const logoStroke = "url(#logo-grad)";
