import React, { useState, useEffect } from "react";

const ScrollProgress: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] pointer-events-none"
      style={{
        width: `${progress}%`,
        background:
          "linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6, #06b6d4)",
        boxShadow: "0 0 10px rgba(236,72,153,0.8), 0 0 20px rgba(139,92,246,0.5)",
        transition: "width 0.05s linear",
      }}
    />
  );
};

export default ScrollProgress;
