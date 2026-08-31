import { useNavigate } from "react-router-dom";

import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Technology from "../components/Technology";

function Landing() {
  const navigate = useNavigate();

  const handleScan = () => {
    navigate("/scan");
  };

  return (
    <main>
      <Hero onScan={handleScan} />

      <Features />

      <HowItWorks />

      <Technology />
    </main>
  );
}

export default Landing;