import { cn } from "@/lib/utils";
import { sitePageShellClass } from "@/lib/site-layout";

/** Standart sayfa sarmalayıcı — genişlik MainWrapper'da sabitlenir */
export const pageContainerClass = "w-full min-w-0";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn(pageContainerClass, className)}>{children}</div>;
}

/** Tam sayfa shell (full-bleed route'larda doğrudan kullanılır) */
export function PageShell({ children, className }: PageContainerProps) {
  return <div className={cn(sitePageShellClass, className)}>{children}</div>;
}
