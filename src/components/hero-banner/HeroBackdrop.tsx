import { useId } from 'react';

const HeroBackdrop = () => {
  const id = useId();
  return (
    <div className="hero-atmosphere" aria-hidden="true">
      <svg viewBox="0 0 780 360" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={id}>
            <stop stopColor="#4b8fff" stopOpacity="0" />
            <stop offset=".55" stopColor="#5395ff" stopOpacity=".45" />
            <stop offset="1" stopColor="#95c8ff" stopOpacity=".06" />
          </linearGradient>
        </defs>
        <g stroke={`url(#${id})`}>
          <path d="M-140 330C150 510 485 336 632 139S930 3 954 68" />
          <path d="M-150 305C151 465 484 310 628 120S921-20 952 40" />
          <path d="M-170 280C155 422 486 283 624 102S910-41 950 12" />
        </g>
        <ellipse cx="622" cy="152" rx="198" ry="190" />
        <ellipse cx="622" cy="152" rx="230" ry="220" />
      </svg>
      <div className="hero-star hero-star--one" />
      <div className="hero-star hero-star--two" />
      <div className="hero-star hero-star--three" />
      <div className="hero-horizon" />
    </div>
  );
};

export default HeroBackdrop;
