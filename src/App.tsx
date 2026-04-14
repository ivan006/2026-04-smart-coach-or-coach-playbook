import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppSidebar from "@/components/AppSidebar";
import ThinkPage from "@/pages/ThinkPage/ThinkPage";
import PredictPage from "@/pages/PredictPage";
import ActPage from "@/pages/ActPage/ActPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppSidebar />
        <Routes>
          <Route path="/" element={<Navigate to="/think" replace />} />
          <Route path="/think" element={<ThinkPage />} />
          <Route path="/predict" element={<PredictPage />} />
          <Route path="/act" element={<ActPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
