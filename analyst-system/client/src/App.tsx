import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AnalystReports from "./pages/AnalystReports";
import { Toaster } from "@/components/ui/toaster";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">애널리스트 분석 시스템</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <AnalystReports />
        </main>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;