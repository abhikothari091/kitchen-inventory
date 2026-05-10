import { AuthProvider } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { LowStockNotifier } from "@/components/low-stock-notifier";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen pb-16">
        <main className="flex-1 max-w-lg mx-auto w-full px-4">{children}</main>
        <BottomNav />
      </div>
      <LowStockNotifier />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
