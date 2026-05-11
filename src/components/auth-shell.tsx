import Image from 'next/image';

interface AuthShellProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-black/[0.04] p-4 md:p-10">
      <div className="flex w-full max-w-[332px] flex-col items-center gap-5">
        <Image
          src="/figma/balina-logo.svg"
          alt="BalinaOS"
          width={64}
          height={64}
          priority
        />
        <div className="flex w-full flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-semibold leading-[1.4] text-black">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm leading-[1.43] text-black/80">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
