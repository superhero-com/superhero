import aeternityMark from '@/svg/aeternity-mark.svg';
import './RailCards.css';

const AeternityBadge = () => (
  <span className="rail-badge rail-badge--ae" aria-hidden="true">
    <img src={aeternityMark} alt="" />
  </span>
);

export default AeternityBadge;
