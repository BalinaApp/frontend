import * as React from 'react';

/** TikTok marka tile'ı — siyah arka plan + beyaz nota glifi. */
export function TiktokMark({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <rect width="40" height="40" fill="#010101" />
      <path
        d="M27.5 13.2c-1.4-.9-2.3-2.4-2.6-4.1h-3.2v13.9c0 1.7-1.4 3.1-3.1 3.1s-3.1-1.4-3.1-3.1 1.4-3.1 3.1-3.1c.3 0 .6 0 .9.1v-3.3c-.3 0-.6-.1-.9-.1-3.5 0-6.4 2.9-6.4 6.4s2.9 6.4 6.4 6.4 6.4-2.9 6.4-6.4v-7c1.2.9 2.7 1.4 4.3 1.4v-3.2c-.7 0-1.4-.2-2.1-.4z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
