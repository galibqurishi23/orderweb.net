import * as React from "react";

// Simple modern restaurant/food logo inspired by orderweb.co.uk/logo-o/
const AdminLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={36}
    height={36}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="18" cy="18" r="16" stroke="#1A202C" strokeWidth="2" fill="#fff" />
    <path d="M12 24c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#1A202C" strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="18" cy="15" rx="4" ry="3" fill="#1A202C" />
    <rect x="16.5" y="10" width="3" height="3" rx="1.5" fill="#1A202C" />
  </svg>
);

export default AdminLogo;
