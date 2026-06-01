import React from "react";

export interface PlanlyLogoProps {
  variant?: "horizontal" | "negative" | "mono" | "icon";
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function PlanlyLogo({
  variant = "horizontal",
  className = "",
  width = "100%",
  height = "100%",
}: PlanlyLogoProps) {
  if (variant === "icon") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        className={className}
        style={{ width, height }}
      >
        <defs>
          <linearGradient id="aiGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00C0FF" />
            <stop offset="50%" stopColor="#1677D2" />
            <stop offset="100%" stopColor="#6D5DFB" />
          </linearGradient>
        </defs>

        <g id="isotipo" transform="translate(5, 5)">
          <path
            d="M 30,15 L 65,15 L 80,30 L 80,90 A 8,8 0 0 1 72,98 L 38,98 A 8,8 0 0 1 30,90 Z"
            fill="white"
            stroke="#0B2A5B"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M 65,15 L 65,24 C 65,27 68,30 71,30 L 80,30"
            fill="#E2E8F0"
            stroke="#0B2A5B"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <rect x="38" y="27" width="22" height="5" rx="2.5" fill="#1677D2" />
          <rect
            x="38" y="38"
            width="34"
            height="42"
            fill="none"
            stroke="#64748B"
            strokeWidth="1.5"
          />
          <line
            x1="38" y1="48"
            x2="72" y2="48"
            stroke="#64748B"
            strokeWidth="1.5"
          />
          <line
            x1="38" y1="58"
            x2="72" y2="58"
            stroke="#64748B"
            strokeWidth="1.5"
          />
          <line
            x1="38" y1="68"
            x2="72" y2="68"
            stroke="#64748B"
            strokeWidth="1.5"
          />
          <line
            x1="48" y1="58"
            x2="48" y2="80"
            stroke="#64748B"
            strokeWidth="1.5"
          />
          <line
            x1="60" y1="58"
            x2="60" y2="80"
            stroke="#64748B"
            strokeWidth="1.5"
          />
          <path
            d="M 78,40 L 98,40 A 6,6 0 0 1 104,46 L 104,64 A 6,6 0 0 1 98,70 L 88,70 L 80,78 L 80,70 A 6,6 0 0 1 74,64 L 74,46 A 6,6 0 0 1 80,40 Z"
            fill="url(#aiGradIcon)"
          />
          <text
            x="89" y="59"
            fill="white"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            fontSize="12"
            textAnchor="middle"
          >
            AI
          </text>
          <circle cx="68" cy="82" r="14" fill="white" stroke="#0B2A5B" strokeWidth="4" />
          <path
            d="M 61,81 L 66,86 L 75,75"
            fill="none"
            stroke="#22C55E"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 94,8 Q 94,12 98,12 Q 94,12 94,16 Q 94,12 90,12 Q 94,12 94,8 Z"
            fill="#6D5DFB"
          />
          <path
            d="M 106,17 Q 106,20 109,20 Q 106,20 106,23 Q 106,20 103,20 Q 106,20 106,17 Z"
            fill="#27C7B8"
          />
          <path
            d="M 101,3 Q 101,5 103,5 Q 101,5 101,7 Q 101,5 99,5 Q 101,5 101,3 Z"
            fill="#1677D2"
          />
        </g>
      </svg>
    );
  }

  if (variant === "negative") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 450 120"
        className={className}
        style={{ width, height }}
      >
        <defs>
          <linearGradient id="aiGradNegComp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00C0FF" />
            <stop offset="50%" stopColor="#1677D2" />
            <stop offset="100%" stopColor="#6D5DFB" />
          </linearGradient>
          <linearGradient id="yGradNegComp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#27C7B8" />
            <stop offset="100%" stopColor="#1677D2" />
          </linearGradient>
        </defs>

        <g id="isotipo" transform="translate(5, 5)">
          <path
            d="M 30,15 L 65,15 L 80,30 L 80,90 A 8,8 0 0 1 72,98 L 38,98 A 8,8 0 0 1 30,90 Z"
            fill="#0B2A5B"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M 65,15 L 65,24 C 65,27 68,30 71,30 L 80,30"
            fill="#243B6B"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <rect x="38" y="27" width="22" height="5" rx="2.5" fill="#27C7B8" />
          <rect
            x="38" y="38"
            width="34"
            height="42"
            fill="none"
            stroke="#BFD7F5"
            strokeWidth="1.5"
          />
          <line
            x1="38" y1="48"
            x2="72" y2="48"
            stroke="#BFD7F5"
            strokeWidth="1.5"
          />
          <line
            x1="38" y1="58"
            x2="72" y2="58"
            stroke="#BFD7F5"
            strokeWidth="1.5"
          />
          <line
            x1="38" y1="68"
            x2="72" y2="68"
            stroke="#BFD7F5"
            strokeWidth="1.5"
          />
          <line
            x1="48" y1="58"
            x2="48" y2="80"
            stroke="#BFD7F5"
            strokeWidth="1.5"
          />
          <line
            x1="60" y1="58"
            x2="60" y2="80"
            stroke="#BFD7F5"
            strokeWidth="1.5"
          />
          <path
            d="M 78,40 L 98,40 A 6,6 0 0 1 104,46 L 104,64 A 6,6 0 0 1 98,70 L 88,70 L 80,78 L 80,70 A 6,6 0 0 1 74,64 L 74,46 A 6,6 0 0 1 80,40 Z"
            fill="url(#aiGradNegComp)"
          />
          <text
            x="89" y="59"
            fill="white"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            fontSize="12"
            textAnchor="middle"
          >
            AI
          </text>
          <circle cx="68" cy="82" r="14" fill="#0B2A5B" stroke="#FFFFFF" strokeWidth="4" />
          <path
            d="M 61,81 L 66,86 L 75,75"
            fill="none"
            stroke="#27C7B8"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 94,8 Q 94,12 98,12 Q 94,12 94,16 Q 94,12 90,12 Q 94,12 94,8 Z"
            fill="#6D5DFB"
          />
          <path
            d="M 106,17 Q 106,20 109,20 Q 106,20 106,23 Q 106,20 103,20 Q 106,20 106,17 Z"
            fill="#27C7B8"
          />
          <path
            d="M 101,3 Q 101,5 103,5 Q 101,5 101,7 Q 101,5 99,5 Q 101,5 101,3 Z"
            fill="#27C7B8"
          />
        </g>

        <text
          x="125" y="73"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Outfit', 'Segoe UI', sans-serif"
          fontWeight="800"
          fontSize="46"
          fill="#FFFFFF"
          letterSpacing="-1.5"
        >
          Planl<tspan fill="url(#yGradNegComp)">y</tspan>
        </text>

        <line
          x1="125" y1="84"
          x2="270" y2="84"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
        <circle cx="275" cy="84" r="3.5" fill="#27C7B8" />
        <line
          x1="280" y1="84"
          x2="430" y2="84"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />

        <text
          x="277" y="103"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Space Grotesk', 'Segoe UI', sans-serif"
          fontWeight="700"
          fontSize="11.5"
          fill="#BFD7F5"
          letterSpacing="4.5"
          textAnchor="middle"
        >
          PLANEACIÓN DOCENTE CON IA
        </text>
      </svg>
    );
  }

  if (variant === "mono") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 450 120"
        className={className}
        style={{ width, height }}
      >
        <g id="isotipo" transform="translate(5, 5)">
          <path
            d="M 30,15 L 65,15 L 80,30 L 80,90 A 8,8 0 0 1 72,98 L 38,98 A 8,8 0 0 1 30,90 Z"
            fill="white"
            stroke="#172033"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M 65,15 L 65,24 C 65,27 68,30 71,30 L 80,30"
            fill="#E2E8F0"
            stroke="#172033"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <rect x="38" y="27" width="22" height="5" rx="2.5" fill="#172033" />
          <rect
            x="38" y="38"
            width="34"
            height="42"
            fill="none"
            stroke="#172033"
            strokeWidth="1.5"
          />
          <line
            x1="38" y1="48"
            x2="72" y2="48"
            stroke="#172033"
            strokeWidth="1.5"
          />
          <line
            x1="38" y1="58"
            x2="72" y2="58"
            stroke="#172033"
            strokeWidth="1.5"
          />
          <line
            x1="38" y1="68"
            x2="72" y2="68"
            stroke="#172033"
            strokeWidth="1.5"
          />
          <line
            x1="48" y1="58"
            x2="48" y2="80"
            stroke="#172033"
            strokeWidth="1.5"
          />
          <line
            x1="60" y1="58"
            x2="60" y2="80"
            stroke="#172033"
            strokeWidth="1.5"
          />
          <path
            d="M 78,40 L 98,40 A 6,6 0 0 1 104,46 L 104,64 A 6,6 0 0 1 98,70 L 88,70 L 80,78 L 80,70 A 6,6 0 0 1 74,64 L 74,46 A 6,6 0 0 1 80,40 Z"
            fill="#172033"
          />
          <text
            x="89" y="59"
            fill="white"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="900"
            fontSize="12"
            textAnchor="middle"
          >
            AI
          </text>
          <circle cx="68" cy="82" r="14" fill="white" stroke="#172033" strokeWidth="4" />
          <path
            d="M 61,81 L 66,86 L 75,75"
            fill="none"
            stroke="#172033"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 94,8 Q 94,12 98,12 Q 94,12 94,16 Q 94,12 90,12 Q 94,12 94,8 Z"
            fill="#172033"
          />
          <path
            d="M 106,17 Q 106,20 109,20 Q 106,20 106,23 Q 106,20 103,20 Q 106,20 106,17 Z"
            fill="#172033"
          />
          <path
            d="M 101,3 Q 101,5 103,5 Q 101,5 101,7 Q 101,5 99,5 Q 101,5 101,3 Z"
            fill="#172033"
          />
        </g>

        <text
          x="125" y="73"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Outfit', 'Segoe UI', sans-serif"
          fontWeight="800"
          fontSize="46"
          fill="#172033"
          letterSpacing="-1.5"
        >
          Planly
        </text>

        <line x1="125" y1="84" x2="270" y2="84" stroke="#172033" strokeWidth="1.5" />
        <circle cx="275" cy="84" r="3.5" fill="#172033" />
        <line x1="280" y1="84" x2="430" y2="84" stroke="#172033" strokeWidth="1.5" />

        <text
          x="277" y="103"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Space Grotesk', 'Segoe UI', sans-serif"
          fontWeight="700"
          fontSize="11.5"
          fill="#172033"
          letterSpacing="4.5"
          textAnchor="middle"
        >
          PLANEACIÓN DOCENTE CON IA
        </text>
      </svg>
    );
  }

  // Variant default "horizontal"
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 450 120"
      className={className}
      style={{ width, height }}
    >
      <defs>
        <linearGradient id="aiGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C0FF" />
          <stop offset="50%" stopColor="#1677D2" />
          <stop offset="100%" stopColor="#6D5DFB" />
        </linearGradient>
        <linearGradient id="yGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#27C7B8" />
          <stop offset="100%" stopColor="#1677D2" />
        </linearGradient>
      </defs>

      <g id="isotipo" transform="translate(5, 5)">
        <path
          d="M 30,15 L 65,15 L 80,30 L 80,90 A 8,8 0 0 1 72,98 L 38,98 A 8,8 0 0 1 30,90 Z"
          fill="white"
          stroke="#0B2A5B"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M 65,15 L 65,24 C 65,27 68,30 71,30 L 80,30"
          fill="#E2E8F0"
          stroke="#0B2A5B"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <rect x="38" y="27" width="22" height="5" rx="2.5" fill="#1677D2" />
        <rect
          x="38" y="38"
          width="34"
          height="42"
          fill="none"
          stroke="#64748B"
          strokeWidth="1.5"
        />
        <line
          x1="38" y1="48"
          x2="72" y2="48"
          stroke="#64748B"
          strokeWidth="1.5"
        />
        <line
          x1="38" y1="58"
          x2="72" y2="58"
          stroke="#64748B"
          strokeWidth="1.5"
        />
        <line
          x1="38" y1="68"
          x2="72" y2="68"
          stroke="#64748B"
          strokeWidth="1.5"
        />
        <line
          x1="48" y1="58"
          x2="48" y2="80"
          stroke="#64748B"
          strokeWidth="1.5"
        />
        <line
          x1="60" y1="58"
          x2="60" y2="80"
          stroke="#64748B"
          strokeWidth="1.5"
        />
        <path
          d="M 78,40 L 98,40 A 6,6 0 0 1 104,46 L 104,64 A 6,6 0 0 1 98,70 L 88,70 L 80,78 L 80,70 A 6,6 0 0 1 74,64 L 74,46 A 6,6 0 0 1 80,40 Z"
          fill="url(#aiGradComp)"
        />
        <text
          x="89" y="59"
          fill="white"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="12"
          textAnchor="middle"
        >
          AI
        </text>
        <circle cx="68" cy="82" r="14" fill="white" stroke="#0B2A5B" strokeWidth="4" />
        <path
          d="M 61,81 L 66,86 L 75,75"
          fill="none"
          stroke="#22C55E"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 94,8 Q 94,12 98,12 Q 94,12 94,16 Q 94,12 90,12 Q 94,12 94,8 Z"
          fill="#6D5DFB"
        />
        <path
          d="M 106,17 Q 106,20 109,20 Q 106,20 106,23 Q 106,20 103,20 Q 106,20 106,17 Z"
          fill="#27C7B8"
        />
        <path
          d="M 101,3 Q 101,5 103,5 Q 101,5 101,7 Q 101,5 99,5 Q 101,5 101,3 Z"
          fill="#1677D2"
        />
      </g>

      <text
        x="125" y="73"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Outfit', 'Segoe UI', sans-serif"
        fontWeight="800"
        fontSize="46"
        fill="#0B2A5B"
        letterSpacing="-1.5"
      >
        Planl<tspan fill="url(#yGradComp)">y</tspan>
      </text>

      <line x1="125" y1="84" x2="270" y2="84" stroke="#D9E2EC" strokeWidth="1.5" />
      <circle cx="275" cy="84" r="3.5" fill="#27C7B8" />
      <line x1="280" y1="84" x2="430" y2="84" stroke="#D9E2EC" strokeWidth="1.5" />

      <text
        x="277" y="103"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Space Grotesk', 'Segoe UI', sans-serif"
        fontWeight="700"
        fontSize="11.5"
        fill="#64748B"
        letterSpacing="4.5"
        textAnchor="middle"
      >
        PLANEACIÓN DOCENTE CON IA
      </text>
    </svg>
  );
}
