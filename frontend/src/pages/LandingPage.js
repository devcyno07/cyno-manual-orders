import React, { useCallback } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
import ProductsSection from '../components/ProductsSection';
import OrderSection from '../components/OrderSection';
import OrderChatBot from '../components/OrderChatBot';

export default function LandingPage() {
  const scrollToOrder = useCallback(() => {
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div style={{ background: '#ffffff' }}>
       <Navbar />
      {/*<HeroSection />
      <AboutSection />
      <ProductsSection onOrderClick={scrollToOrder} /> */}
      <OrderSection />
      <OrderChatBot/>
    </div>
  );
}
