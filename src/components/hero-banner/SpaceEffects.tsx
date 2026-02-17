import React from 'react';

interface SpaceEffectsProps {
  supernovaColor: string;
}

// Far stars layer
const StarsFar = () => (
  <svg
    className="banner-stars far"
    viewBox="0 0 1600 620"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g className="banner-twinkle">
      <circle cx="1222.5" cy="401.1" r="1.05" style={{ opacity: 0.73, animationDelay: '3.51s', animationDuration: '6.49s' }} />
      <circle cx="670.8" cy="339.5" r="1.04" style={{ opacity: 0.98, animationDelay: '6.14s', animationDuration: '8.98s' }} />
      <circle cx="1115.6" cy="615.2" r="0.97" style={{ opacity: 0.69, animationDelay: '1.2s', animationDuration: '7.07s' }} />
      <circle cx="93.0" cy="64.6" r="0.91" style={{ opacity: 0.98, animationDelay: '5.97s', animationDuration: '8.64s' }} />
      <circle cx="1284.4" cy="186.7" r="1.26" style={{ opacity: 0.75, animationDelay: '2.69s', animationDuration: '6.37s' }} />
      <circle cx="378.0" cy="101.5" r="0.95" style={{ opacity: 0.88, animationDelay: '6.65s', animationDuration: '5.85s' }} />
      <circle cx="1431.8" cy="365.1" r="0.70" style={{ opacity: 0.84, animationDelay: '1.83s', animationDuration: '7.41s' }} />
      <circle cx="1557.9" cy="92.9" r="0.70" style={{ opacity: 0.86, animationDelay: '0.56s', animationDuration: '6.47s' }} />
      <circle cx="68.9" cy="61.9" r="1.15" style={{ opacity: 0.56, animationDelay: '0.69s', animationDuration: '7.94s' }} />
      <circle cx="374.9" cy="10.5" r="0.91" style={{ opacity: 0.79, animationDelay: '4.42s', animationDuration: '8.66s' }} />
      <circle cx="941.1" cy="118.0" r="1.01" style={{ opacity: 0.55, animationDelay: '4.86s', animationDuration: '5.88s' }} />
      <circle cx="1223.4" cy="26.2" r="0.95" style={{ opacity: 0.81, animationDelay: '5.71s', animationDuration: '4.56s' }} />
      <circle cx="1265.7" cy="18.6" r="0.54" style={{ opacity: 0.77, animationDelay: '2.87s', animationDuration: '6.19s' }} />
      <circle cx="1295.7" cy="13.9" r="0.76" style={{ opacity: 0.79, animationDelay: '3.59s', animationDuration: '5.43s' }} />
      <circle cx="1264.4" cy="245.9" r="0.59" style={{ opacity: 0.99, animationDelay: '0.9s', animationDuration: '8.87s' }} />
      <circle cx="545.0" cy="359.9" r="1.22" style={{ opacity: 0.77, animationDelay: '2.76s', animationDuration: '8.57s' }} />
      <circle cx="581.0" cy="554.8" r="1.15" style={{ opacity: 0.65, animationDelay: '3.23s', animationDuration: '4.47s' }} />
      <circle cx="335.7" cy="318.8" r="1.11" style={{ opacity: 0.84, animationDelay: '6.53s', animationDuration: '8.61s' }} />
      <circle cx="112.3" cy="452.1" r="1.08" style={{ opacity: 0.96, animationDelay: '5.86s', animationDuration: '7.78s' }} />
      <circle cx="105.6" cy="136.4" r="1.04" style={{ opacity: 0.59, animationDelay: '0.13s', animationDuration: '8.6s' }} />
      <circle cx="1432.9" cy="246.4" r="0.93" style={{ opacity: 0.89, animationDelay: '3.65s', animationDuration: '8.73s' }} />
      <circle cx="270.7" cy="233.6" r="0.60" style={{ opacity: 0.7, animationDelay: '5.74s', animationDuration: '4.51s' }} />
      <circle cx="1539.1" cy="156.4" r="0.95" style={{ opacity: 0.72, animationDelay: '3.61s', animationDuration: '6.04s' }} />
      <circle cx="539.3" cy="523.3" r="0.52" style={{ opacity: 0.6, animationDelay: '4.82s', animationDuration: '9.06s' }} />
      <circle cx="590.2" cy="48.4" r="0.81" style={{ opacity: 0.67, animationDelay: '1.67s', animationDuration: '9.57s' }} />
      <circle cx="669.6" cy="225.5" r="0.68" style={{ opacity: 0.87, animationDelay: '3.55s', animationDuration: '5.35s' }} />
      <circle cx="531.2" cy="135.7" r="1.27" style={{ opacity: 0.72, animationDelay: '6.47s', animationDuration: '4.4s' }} />
      <circle cx="839.4" cy="168.6" r="1.08" style={{ opacity: 0.85, animationDelay: '2.83s', animationDuration: '8.75s' }} />
      <circle cx="669.5" cy="584.9" r="0.78" style={{ opacity: 0.68, animationDelay: '1.95s', animationDuration: '4.73s' }} />
      <circle cx="1299.2" cy="471.2" r="1.31" style={{ opacity: 0.73, animationDelay: '0.92s', animationDuration: '5.19s' }} />
      <circle cx="945.2" cy="203.0" r="1.28" style={{ opacity: 0.61, animationDelay: '5.02s', animationDuration: '9.5s' }} />
      <circle cx="672.7" cy="222.7" r="0.61" style={{ opacity: 0.96, animationDelay: '4.33s', animationDuration: '9.86s' }} />
      <circle cx="1321.3" cy="494.6" r="0.72" style={{ opacity: 0.73, animationDelay: '4.0s', animationDuration: '4.17s' }} />
      <circle cx="1373.4" cy="511.2" r="1.19" style={{ opacity: 0.76, animationDelay: '5.2s', animationDuration: '4.6s' }} />
      <circle cx="314.8" cy="3.4" r="0.52" style={{ opacity: 0.97, animationDelay: '5.04s', animationDuration: '8.03s' }} />
      <circle cx="1128.4" cy="435.3" r="1.27" style={{ opacity: 0.61, animationDelay: '2.93s', animationDuration: '5.47s' }} />
      <circle cx="342.1" cy="173.0" r="0.63" style={{ opacity: 0.9, animationDelay: '4.71s', animationDuration: '4.36s' }} />
      <circle cx="1404.3" cy="215.1" r="0.89" style={{ opacity: 0.88, animationDelay: '6.13s', animationDuration: '8.54s' }} />
      <circle cx="821.3" cy="52.1" r="0.85" style={{ opacity: 0.55, animationDelay: '1.25s', animationDuration: '9.72s' }} />
      <circle cx="125.0" cy="587.0" r="0.62" style={{ opacity: 0.6, animationDelay: '3.42s', animationDuration: '7.04s' }} />
      <circle cx="962.3" cy="17.9" r="0.66" style={{ opacity: 0.67, animationDelay: '1.0s', animationDuration: '8.7s' }} />
      <circle cx="1282.1" cy="76.9" r="0.96" style={{ opacity: 0.9, animationDelay: '5.96s', animationDuration: '5.22s' }} />
      <circle cx="1081.8" cy="348.0" r="0.69" style={{ opacity: 0.88, animationDelay: '0.85s', animationDuration: '6.65s' }} />
      <circle cx="465.1" cy="362.6" r="1.16" style={{ opacity: 0.79, animationDelay: '1.15s', animationDuration: '6.21s' }} />
      <circle cx="1054.7" cy="348.7" r="1.03" style={{ opacity: 0.72, animationDelay: '3.51s', animationDuration: '8.26s' }} />
      <circle cx="1281.8" cy="103.8" r="0.57" style={{ opacity: 0.59, animationDelay: '0.23s', animationDuration: '4.79s' }} />
      <circle cx="1437.6" cy="165.1" r="0.53" style={{ opacity: 0.63, animationDelay: '5.25s', animationDuration: '5.27s' }} />
      <circle cx="1321.7" cy="266.2" r="0.66" style={{ opacity: 0.82, animationDelay: '1.4s', animationDuration: '5.5s' }} />
      <circle cx="951.9" cy="487.1" r="0.53" style={{ opacity: 0.86, animationDelay: '0.48s', animationDuration: '6.31s' }} />
      <circle cx="454.2" cy="318.8" r="0.84" style={{ opacity: 0.73, animationDelay: '0.18s', animationDuration: '8.7s' }} />
    </g>
  </svg>
);

// Near stars layer
const StarsNear = () => (
  <svg
    className="banner-stars near"
    viewBox="0 0 1600 620"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <g className="banner-twinkle">
      <circle cx="1303.2" cy="59.5" r="1.91" style={{ opacity: 0.74, animationDelay: '5.11s', animationDuration: '5.54s' }} />
      <circle cx="54.6" cy="91.3" r="1.58" style={{ opacity: 0.86, animationDelay: '5.41s', animationDuration: '5.13s' }} />
      <circle cx="606.1" cy="338.5" r="1.80" style={{ opacity: 0.74, animationDelay: '1.65s', animationDuration: '5.05s' }} />
      <circle cx="1564.3" cy="252.1" r="1.81" style={{ opacity: 0.94, animationDelay: '1.22s', animationDuration: '8.52s' }} />
      <circle cx="584.1" cy="127.6" r="0.92" style={{ opacity: 0.82, animationDelay: '1.01s', animationDuration: '5.75s' }} />
      <circle cx="1398.6" cy="159.4" r="1.92" style={{ opacity: 0.89, animationDelay: '1.17s', animationDuration: '7.0s' }} />
      <circle cx="1442.9" cy="565.6" r="1.94" style={{ opacity: 0.55, animationDelay: '0.58s', animationDuration: '9.19s' }} />
      <circle cx="733.6" cy="226.2" r="1.32" style={{ opacity: 0.86, animationDelay: '0.6s', animationDuration: '6.45s' }} />
      <circle cx="1071.9" cy="3.9" r="1.76" style={{ opacity: 0.69, animationDelay: '2.2s', animationDuration: '7.24s' }} />
      <circle cx="1075.0" cy="312.5" r="1.85" style={{ opacity: 0.99, animationDelay: '0.4s', animationDuration: '6.38s' }} />
      <circle cx="36.0" cy="66.8" r="1.66" style={{ opacity: 0.64, animationDelay: '6.86s', animationDuration: '4.51s' }} />
      <circle cx="1108.1" cy="316.4" r="1.91" style={{ opacity: 0.64, animationDelay: '0.88s', animationDuration: '4.78s' }} />
      <circle cx="684.5" cy="149.0" r="1.38" style={{ opacity: 0.69, animationDelay: '0.63s', animationDuration: '7.47s' }} />
      <circle cx="352.8" cy="91.3" r="1.18" style={{ opacity: 0.85, animationDelay: '2.08s', animationDuration: '9.86s' }} />
      <circle cx="1382.5" cy="296.5" r="0.91" style={{ opacity: 0.99, animationDelay: '4.4s', animationDuration: '8.43s' }} />
      <circle cx="10.9" cy="22.8" r="1.74" style={{ opacity: 0.58, animationDelay: '1.64s', animationDuration: '4.08s' }} />
      <circle cx="1291.6" cy="335.0" r="1.91" style={{ opacity: 0.71, animationDelay: '5.43s', animationDuration: '6.89s' }} />
      <circle cx="552.3" cy="103.9" r="1.91" style={{ opacity: 0.73, animationDelay: '2.85s', animationDuration: '6.84s' }} />
      <circle cx="873.2" cy="529.4" r="1.58" style={{ opacity: 0.9, animationDelay: '3.44s', animationDuration: '8.06s' }} />
      <circle cx="975.3" cy="329.5" r="1.03" style={{ opacity: 0.87, animationDelay: '1.06s', animationDuration: '7.99s' }} />
      <circle cx="1334.5" cy="164.0" r="1.31" style={{ opacity: 0.8, animationDelay: '0.05s', animationDuration: '7.5s' }} />
      <circle cx="418.8" cy="415.0" r="1.88" style={{ opacity: 0.82, animationDelay: '3.0s', animationDuration: '7.72s' }} />
      <circle cx="894.3" cy="134.2" r="0.82" style={{ opacity: 0.99, animationDelay: '6.93s', animationDuration: '9.14s' }} />
      <circle cx="1350.2" cy="77.7" r="1.00" style={{ opacity: 0.87, animationDelay: '2.86s', animationDuration: '7.94s' }} />
      <circle cx="1083.4" cy="288.3" r="1.07" style={{ opacity: 0.85, animationDelay: '4.29s', animationDuration: '6.19s' }} />
      <circle cx="257.0" cy="533.7" r="0.88" style={{ opacity: 0.85, animationDelay: '6.93s', animationDuration: '9.81s' }} />
      <circle cx="999.2" cy="126.6" r="1.53" style={{ opacity: 0.57, animationDelay: '3.12s', animationDuration: '7.58s' }} />
      <circle cx="1312.7" cy="400.2" r="1.78" style={{ opacity: 0.66, animationDelay: '5.54s', animationDuration: '4.02s' }} />
      <circle cx="960.1" cy="223.0" r="0.98" style={{ opacity: 0.76, animationDelay: '5.21s', animationDuration: '9.55s' }} />
      <circle cx="773.1" cy="340.2" r="1.72" style={{ opacity: 0.71, animationDelay: '4.08s', animationDuration: '5.49s' }} />
    </g>
  </svg>
);

const SpaceEffects = ({ supernovaColor }: SpaceEffectsProps) => (
  <div className="banner-space">
    <div className="banner-aurora" />
    <div
      className="banner-supernova"
      style={{
        background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0 6%, ${supernovaColor} 20%, rgba(255,255,255,.0) 70%)`,
      }}
    />
    <div
      className="banner-supernova banner-supernova--2"
      style={{
        background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0 6%, ${supernovaColor} 20%, rgba(255,255,255,.0) 70%)`,
      }}
    />
    <div className="banner-comet" />
    <div className="banner-planet">
      <div className="banner-ring" />
      <span className="banner-token" />
      <span className="banner-token t2" />
      <span className="banner-token t3" />
    </div>
    <div className="banner-grid" />
    <StarsFar />
    <StarsNear />
  </div>
);

export default SpaceEffects;
