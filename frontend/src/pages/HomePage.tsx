import React from 'react';
import Navbar from '../components/Navbar/Navbar';
import HeroSection from '../components/IntroSectionHomePage/HeroSection';
import FeaturesSection from '../components/FeatureSectionHomePage/FeaturesSection';
import HowItWorksSection from '../components/HowItWorkHomePage/HowItWorksSection';
import RobotDecorations from '../components/RobotDecoration/RobotDecorations';
import Footer from '../components/Footer/Footer';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <RobotDecorations />
      <Footer />
    </div>
  );
};

export default HomePage;
