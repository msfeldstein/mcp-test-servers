import { DataUrlConverter } from './components/DataUrlConverter';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <DataUrlConverter />
      <Toaster />
    </div>
  );
}