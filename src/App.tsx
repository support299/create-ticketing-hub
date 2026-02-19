import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocationProvider } from "@/contexts/LocationContext";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Orders from "./pages/Orders";
import Attendees from "./pages/Attendees";
import CheckIn from "./pages/CheckIn";
import OrderSeats from "./pages/OrderSeats";
import NotFound from "./pages/NotFound";
import { LocationGuard } from "./components/layout/LocationGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LocationProvider>
          <Routes>
            <Route path="/" element={<LocationGuard><Dashboard /></LocationGuard>} />
            <Route path="/events" element={<LocationGuard><Events /></LocationGuard>} />
            <Route path="/events/:id" element={<LocationGuard><EventDetail /></LocationGuard>} />
            <Route path="/orders" element={<LocationGuard><Orders /></LocationGuard>} />
            <Route path="/attendees" element={<LocationGuard><Attendees /></LocationGuard>} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/orders/:ticketNumber" element={<LocationGuard><OrderSeats /></LocationGuard>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </LocationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
