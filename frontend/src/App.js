import React from 'react';
import { LangProvider } from './i18n/LangContext';
import LandingPage from './pages/LandingPage';

export default function App() {
  return (
    <LangProvider>
      <LandingPage />
    </LangProvider>
  );
}
