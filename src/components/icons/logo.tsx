import * as React from 'react';
import type { SVGProps } from 'react';

export function DineDeskLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2a5 5 0 0 0-5 5v1.5A1.5 1.5 0 0 0 8.5 10H12h3.5A1.5 1.5 0 0 0 17 8.5V7a5 5 0 0 0-5-5Z" />
      <path d="M12 10v6" />
      <path d="M12 16a3 3 0 0 0-3 3v1a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-1a3 3 0 0 0-3-3Z" />
      <path d="M7 10v6" />
      <path d="M17 10v6" />
    </svg>
  );
}
