import { useNavigate } from 'react-router-dom';
import EventForm from '../../components/events/EventForm.jsx';
import { eventService } from '../../services/eventService.js';
import { useAuth } from '../../state/AuthState.jsx';

export default function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const submit = async (values) => { await eventService.create({ ...values, vendorId: user.id }); navigate('/vendor/events'); };
  return (<><h2 className="page-title">Create event</h2><EventForm onSubmit={submit} submitLabel="Publish event" /></>);
}
