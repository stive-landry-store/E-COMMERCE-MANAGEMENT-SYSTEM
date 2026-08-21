/** Small brand marks used in the checkout payment list. */

export function VisaLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" aria-hidden>
      <rect width="48" height="32" rx="3" fill="#fff" stroke="#e5e7eb" />
      <text x="24" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="11" fontWeight="700" fontStyle="italic" fill="#1a1f71">
        VISA
      </text>
    </svg>
  );
}

export function MastercardLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" aria-hidden>
      <rect width="48" height="32" rx="3" fill="#fff" stroke="#e5e7eb" />
      <circle cx="19" cy="16" r="8" fill="#eb001b" />
      <circle cx="29" cy="16" r="8" fill="#f79e1b" />
      <path d="M24 10.2a8 8 0 0 1 0 11.6 8 8 0 0 1 0-11.6z" fill="#ff5f00" />
    </svg>
  );
}

export function AmexLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" aria-hidden>
      <rect width="48" height="32" rx="3" fill="#2e77bc" />
      <text x="24" y="20" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="8" fontWeight="800" fill="#fff" letterSpacing="0.5">
        AMEX
      </text>
    </svg>
  );
}

export function MaestroLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" aria-hidden>
      <rect width="48" height="32" rx="3" fill="#fff" stroke="#e5e7eb" />
      <circle cx="19" cy="16" r="8" fill="#eb001b" />
      <circle cx="29" cy="16" r="8" fill="#00a2e5" />
    </svg>
  );
}

export function PaypalLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 24" aria-hidden>
      <text x="0" y="18" fontFamily="Arial,Helvetica,sans-serif" fontSize="16" fontWeight="700" fontStyle="italic">
        <tspan fill="#003087">Pay</tspan>
        <tspan fill="#009cde">Pal</tspan>
      </text>
    </svg>
  );
}

export function ApplePayLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" aria-hidden>
      <rect width="48" height="32" rx="3" fill="#000" />
      <text x="24" y="20" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="8" fontWeight="600" fill="#fff">
        Pay
      </text>
    </svg>
  );
}

export function GooglePayLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 24" aria-hidden>
      <text x="0" y="17" fontFamily="Arial,sans-serif" fontSize="12" fontWeight="500">
        <tspan fill="#4285F4">G</tspan>
        <tspan fill="#EA4335">o</tspan>
        <tspan fill="#FBBC05">o</tspan>
        <tspan fill="#4285F4">g</tspan>
        <tspan fill="#34A853">l</tspan>
        <tspan fill="#EA4335">e</tspan>
        <tspan fill="#5f6368"> Pay</tspan>
      </text>
    </svg>
  );
}

export function OrangeMoneyLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" aria-hidden>
      <rect width="48" height="32" rx="3" fill="#ff7900" />
      <text x="24" y="20" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="7" fontWeight="800" fill="#fff">
        Orange
      </text>
    </svg>
  );
}

export function MtnMomoLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" aria-hidden>
      <rect width="48" height="32" rx="3" fill="#ffcc00" />
      <text x="24" y="20" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="8" fontWeight="800" fill="#000">
        MoMo
      </text>
    </svg>
  );
}
