import Funnel from './ui/Funnel';
export default function Page() { return <Funnel preview={process.env.LEAD_CAPTURE_ENABLED !== 'true'}/>; }
