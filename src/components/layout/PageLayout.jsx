import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import EventChatButton from '../ai/EventChatButton.jsx';

export default function PageLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="page-shell">
      <Navbar />
      <main className="container page-main fade-up" key={pathname}>
        <Outlet />
      </main>
      <Footer />
      <EventChatButton />
    </div>
  );
}
