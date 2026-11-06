import { AuthProvider } from './state/AuthState.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import AnimatedBackground from './components/background/AnimatedBackground.jsx';

export default function App() {
  return (
    <AuthProvider>
      <AnimatedBackground />
      <AppRoutes />
    </AuthProvider>
  );
}
