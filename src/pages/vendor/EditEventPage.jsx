import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EventForm from '../../components/events/EventForm.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import { eventService } from '../../services/eventService.js';

export default function EditEventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  useEffect(() => { eventService.get(id).then(setEvent); }, [id]);
  if (!event) return <LoadingState />;
  const submit = async (values) => { await eventService.update(id, values); navigate('/vendor/events'); };
  return (<><h2 className="page-title">Edit event</h2><EventForm initial={event} onSubmit={submit} submitLabel="Save changes" /></>);
}
