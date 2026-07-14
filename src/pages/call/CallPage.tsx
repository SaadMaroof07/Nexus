import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const WS_URL = 'ws://127.0.0.1:8000/ws/call/';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export const CallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasStartedRef = useRef(false); // NEW: queue

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    if (!roomId) return;
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    startCall();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    console.log('🎬 Local media stream acquired - tracks:', stream.getTracks().map(t => t.kind));

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      console.log('➕ Adding track to peer connection:', track.kind);
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      console.log('🎥 ontrack event:', event.track.kind, event.streams);
      if (remoteVideoRef.current && event.streams.length > 0) {
        remoteVideoRef.current.srcObject = event.streams[0];
        console.log('✅ Remote stream set to video element');
      }
      setConnected(true);
      setStatus('Connected');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({ event: 'ice_candidate', candidate: event.candidate });
      }
    };

    // NEW: helper to flush queued candidates once remote description is ready
    const flushPendingCandidates = async () => {
      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding queued ICE candidate', err);
          }
        }
      }
    };

    const ws = new WebSocket(`${WS_URL}${roomId}/`);
    wsRef.current = ws;

    ws.onopen = () => setStatus('Waiting for other participant...');

    ws.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);
      console.log('📨 WebSocket message received:', data.event);

      if (data.event === 'user_joined') {
        console.log('👤 User joined - creating offer');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendMessage({ event: 'offer', offer });
      }

      if (data.event === 'offer') {
        console.log('📋 Offer received - creating answer');
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        await flushPendingCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage({ event: 'answer', answer });
      }

      if (data.event === 'answer') {
        console.log('✔️ Answer received - setting remote description');
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await flushPendingCandidates();
        }
      }

      if (data.event === 'ice_candidate' && data.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error('Error adding ICE candidate', err);
          }
        } else {
          pendingCandidatesRef.current.push(data.candidate);
        }
      }

      if (data.event === 'user_left') {
        console.log('👋 User left');
        setStatus('Other participant left');
        setConnected(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      }
    };
  };

  const sendMessage = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    setVideoOn((prev) => !prev);
  };

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    wsRef.current?.close();
  };

  const endCall = () => {
    cleanup();
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-black"
        />

        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
            {status}
          </div>
        )}

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-6 right-6 w-48 h-32 object-cover rounded-lg border-2 border-white shadow-lg bg-black"
        />
      </div>

      <div className="bg-gray-800 py-4 flex items-center justify-center gap-4">
        <Button
          variant={micOn ? 'outline' : 'primary'}
          onClick={toggleMic}
          className="rounded-full w-12 h-12 flex items-center justify-center p-0"
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </Button>

        <Button
          variant={videoOn ? 'outline' : 'primary'}
          onClick={toggleVideo}
          className="rounded-full w-12 h-12 flex items-center justify-center p-0"
        >
          {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </Button>

        <Button
          onClick={endCall}
          className="rounded-full w-12 h-12 flex items-center justify-center p-0 bg-red-600 hover:bg-red-700 text-white"
        >
          <PhoneOff size={20} />
        </Button>
      </div>
    </div>
  );
};
