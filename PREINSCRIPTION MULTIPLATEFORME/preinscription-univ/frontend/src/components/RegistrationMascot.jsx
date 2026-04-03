/**
 * Illustration décorative : humanoïde souriant qui « tire » le formulaire (animation CSS).
 */
export default function RegistrationMascot({ compact = false }) {
  return (
    <div
      className={`pointer-events-none select-none ${compact ? 'scale-[0.88] opacity-95' : ''}`}
      aria-hidden="true"
    >
      <style>{`
        @keyframes reg-mascot-pull {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes reg-mascot-pull-left {
          0%, 100% { transform: rotate(5deg); }
          50% { transform: rotate(-7deg); }
        }
        @keyframes reg-mascot-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes reg-rope-shake {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        @keyframes reg-form-tug {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .reg-mascot-bob { animation: reg-mascot-bob 3.2s ease-in-out infinite; }
        .reg-mascot-arm-r {
          transform-origin: 118px 168px;
          animation: reg-mascot-pull 2.1s ease-in-out infinite;
        }
        .reg-mascot-arm-l {
          transform-origin: 92px 172px;
          animation: reg-mascot-pull-left 2.1s ease-in-out infinite;
        }
        .reg-mascot-rope {
          animation: reg-rope-shake 2.1s ease-in-out infinite;
          transform-origin: 0% 50%;
        }
        @media (prefers-reduced-motion: reduce) {
          .reg-mascot-bob, .reg-mascot-arm-r, .reg-mascot-arm-l, .reg-mascot-rope { animation: none !important; }
        }
      `}</style>

      <svg
        viewBox="0 0 280 320"
        className="mx-auto h-auto w-36 drop-shadow-[0_16px_48px_rgba(15,23,42,0.45)] sm:w-40 xl:w-[15rem]"
        role="img"
        aria-label=""
      >
        <defs>
          <linearGradient id="regSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd9c0" />
            <stop offset="100%" stopColor="#e8b89a" />
          </linearGradient>
          <linearGradient id="regGown" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="regCap" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>
        </defs>

        {/* Corde vers le formulaire (droite) */}
        <g className="reg-mascot-rope">
          <path
            d="M 210 155 Q 245 148 278 158"
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="8 12"
          />
          <circle cx="278" cy="158" r="6" fill="rgba(255,255,255,0.85)" />
        </g>

        <g className="reg-mascot-bob">
          {/* Jambe droite */}
          <ellipse cx="118" cy="278" rx="22" ry="14" fill="#1e40af" />
          {/* Jambe gauche */}
          <ellipse cx="88" cy="278" rx="22" ry="14" fill="#1e40af" />

          {/* Corps / toge */}
          <path
            d="M 70 175 L 75 255 Q 100 268 130 255 L 140 175 Q 105 160 70 175 Z"
            fill="url(#regGown)"
          />

          {/* Bras gauche (arrière-plan) */}
          <g className="reg-mascot-arm-l">
            <path
              d="M 78 178 Q 55 200 48 225"
              fill="none"
              stroke="url(#regSkin)"
              strokeWidth="18"
              strokeLinecap="round"
            />
            <circle cx="46" cy="228" r="12" fill="url(#regSkin)" />
          </g>

          {/* Tête */}
          <ellipse cx="105" cy="115" rx="52" ry="56" fill="url(#regSkin)" />
          {/* Oreilles */}
          <ellipse cx="55" cy="118" rx="10" ry="12" fill="#e8b89a" opacity="0.9" />
          <ellipse cx="155" cy="118" rx="10" ry="12" fill="#e8b89a" opacity="0.9" />

          {/* Yeux joyeux */}
          <ellipse cx="88" cy="108" rx="9" ry="11" fill="#1e293b" />
          <ellipse cx="122" cy="108" rx="9" ry="11" fill="#1e293b" />
          <circle cx="90" cy="104" r="3" fill="white" />
          <circle cx="124" cy="104" r="3" fill="white" />

          {/* Sourire large */}
          <path
            d="M 78 132 Q 105 158 132 132"
            fill="none"
            stroke="#b45309"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M 82 130 Q 105 148 128 130" fill="#fef3c7" opacity="0.95" />

          {/* Mortier */}
          <path d="M 45 78 L 165 78 L 158 58 L 52 58 Z" fill="url(#regCap)" />
          <rect x="100" y="52" width="10" height="30" fill="#1e293b" />
          <ellipse cx="105" cy="78" rx="68" ry="14" fill="#1e3a8a" />

          {/* Bras droit — tire la corde */}
          <g className="reg-mascot-arm-r">
            <path
              d="M 138 175 Q 175 155 208 152"
              fill="none"
              stroke="url(#regSkin)"
              strokeWidth="18"
              strokeLinecap="round"
            />
            <circle cx="212" cy="151" r="13" fill="url(#regSkin)" />
          </g>
        </g>
      </svg>

      {compact ? (
        <p className="mt-1 max-w-[14rem] text-center text-[10px] font-semibold leading-tight text-white/85 drop-shadow-md xl:hidden">
          On vous aide à ouvrir le formulaire !
        </p>
      ) : (
        <p className="mt-2 hidden max-w-[11rem] text-center text-[11px] font-semibold leading-tight text-white/90 drop-shadow-md xl:block">
          On ouvre ensemble votre inscription !
        </p>
      )}
    </div>
  )
}
