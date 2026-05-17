import * as React from 'react';

/** BalinaOS whale silhouette — yeni logo tasarımının balina + tail + göz
 *  cutout'u, currentColor ile boyanır. Renkli tile / bg üzerinde
 *  (settings rail item'ı, breadcrumb avatar, vb.) text-white veya
 *  text-foreground ile tonlanabilir. evenodd ile göz dot'ı negatif alan
 *  bırakır → tile bg rengi göz olarak gözükür. */
export function BalinaOsMarkMono(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M87.2034 75.183C74.3582 58.1453 55.4752 48.4467 33.9319 49.0746C26.2834 49.4608 18.8608 50.7845 11.7942 53.8568C11.0988 56.8715 10.4347 59.6417 10.0618 62.723C8.37675 76.4362 11.4813 90.312 18.8499 101.999C27.3035 115.373 40.674 124.891 56.0784 128.501C71.5358 132.088 87.7851 129.418 101.283 121.077C101.954 120.655 102.619 120.219 103.279 119.778C116.202 110.954 123.816 99.5112 127.914 84.5609C125.004 89.3285 121.67 92.7108 116.004 94.1117C111.265 95.3007 106.247 94.5383 102.074 91.9965C97.0052 88.8379 90.8709 80.0477 87.2034 75.183ZM100.122 18.3256C99.4051 26.7906 100.692 34.048 106.343 40.7699L106.541 41.0023C100.208 48.6345 98.089 55.333 97.6663 65.0961C104.869 57.3845 116.514 56.0133 124.216 63.7465C127.616 67.3533 128.385 69.4647 129.634 74.1518C130.515 57.3348 125.707 42.7637 114.482 29.9652C111.72 26.8165 103.921 19.7864 100.122 18.3256ZM33.7835 58.7055C36.2301 58.7057 38.2129 60.6886 38.2132 63.1352C38.213 65.5818 36.2301 67.5656 33.7835 67.5658C31.3367 67.5657 29.353 65.5819 29.3528 63.1352C29.3531 60.6885 31.3367 58.7055 33.7835 58.7055Z"
        fill="currentColor"
      />
    </svg>
  );
}
