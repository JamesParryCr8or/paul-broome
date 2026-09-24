import Funnel from '../ui/Funnel';

export default function SqueezePage() {
  return <Funnel preview={process.env.LEAD_CAPTURE_ENABLED !== 'true'} squeeze />;
}
