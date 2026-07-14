import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, X, Trash2, Plus } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Meeting {
  id: number;
  organizer: number;
  organizer_name: string;
  participant: number;
  participant_name: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
}

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    participant: '',
    title: '',
    description: '',
    start_time: '',
    end_time: '',
  });

  const fetchMeetings = () => {
    setLoading(true);
    api.get('/meetings/')
      .then((res) => setMeetings(res.data.results || res.data))
      .catch(() => toast.error('Failed to load meetings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/meetings/', {
        participant: Number(form.participant),
        title: form.title,
        description: form.description,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      });
      toast.success('Meeting scheduled!');
      setShowForm(false);
      setForm({ participant: '', title: '', description: '', start_time: '', end_time: '' });
      fetchMeetings();
    } catch (error: any) {
      const msg = error.response?.data?.non_field_errors?.[0]
        || error.response?.data?.detail
        || 'Failed to schedule meeting';
      toast.error(msg);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await api.patch(`/meetings/${id}/accept/`);
      toast.success('Meeting accepted');
      fetchMeetings();
    } catch {
      toast.error('Failed to accept meeting');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.patch(`/meetings/${id}/reject/`);
      toast.success('Meeting rejected');
      fetchMeetings();
    } catch {
      toast.error('Failed to reject meeting');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await api.delete(`/meetings/${id}/`);
      toast.success('Meeting cancelled');
      fetchMeetings();
    } catch {
      toast.error('Failed to cancel meeting');
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'primary';
      case 'rejected':
      case 'cancelled':
        return 'gray';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading meetings...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Schedule and manage your meetings</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowForm(!showForm)}>
          Schedule Meeting
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">New Meeting</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSchedule} className="space-y-4">
              <Input
                placeholder="Participant User ID"
                value={form.participant}
                onChange={(e) => setForm({ ...form, participant: e.target.value })}
                required
                fullWidth
              />
              <Input
                placeholder="Meeting Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                fullWidth
              />
              <Input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                fullWidth
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Start Time</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">End Time</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <Button type="submit">Schedule</Button>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="space-y-4">
        {meetings.length === 0 && (
          <p className="text-center text-gray-500 py-8">No meetings yet.</p>
        )}

        {meetings.map((meeting) => (
          <Card key={meeting.id}>
            <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                  <Badge variant={statusColor(meeting.status)}>{meeting.status}</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{meeting.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(meeting.start_time).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(meeting.start_time).toLocaleTimeString()} - {new Date(meeting.end_time).toLocaleTimeString()}
                  </span>
                  <span>
                    {meeting.organizer_name} → {meeting.participant_name}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {meeting.status === 'pending' && user?.id === String(meeting.participant) && (
                  <>
                    <Button size="sm" leftIcon={<Check size={16} />} onClick={() => handleAccept(meeting.id)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" leftIcon={<X size={16} />} onClick={() => handleReject(meeting.id)}>
                      Reject
                    </Button>
                  </>
                )}
                {user?.id === String(meeting.organizer) && meeting.status !== 'cancelled' && (
                  <Button size="sm" variant="outline" leftIcon={<Trash2 size={16} />} onClick={() => handleCancel(meeting.id)}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};
