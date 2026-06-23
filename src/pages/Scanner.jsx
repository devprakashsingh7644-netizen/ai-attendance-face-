import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { loadModels, getFaceDescriptions, createFaceMatcher, createLabeledDescriptors } from '../lib/faceApi';
import * as faceapi from 'face-api.js';
import { Camera, AlertCircle, CheckCircle2, User, Loader2 } from 'lucide-react';

export default function Scanner() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [matchResult, setMatchResult] = useState(null); // { student, message, type }
  const [loadingMsg, setLoadingMsg] = useState('Initializing scanner...');

  // Set to track students already marked present in this session to prevent spam DB calls
  const markedPresentToday = useRef(new Set());

  useEffect(() => {
    initScanner();
    return () => stopCamera();
  }, []);

  const initScanner = async () => {
    try {
      setLoadingMsg('Loading AI models...');
      const loaded = await loadModels();
      if (!loaded) throw new Error('Failed to load AI models');
      setIsModelsLoaded(true);

      setLoadingMsg('Fetching student data...');
      // Fetch students and descriptors
      const { data: students, error } = await supabase.from('students').select('*');
      if (error) throw error;

      if (!students || students.length === 0) {
        setMatchResult({ type: 'warning', message: 'No students found in the database. Please add students first.' });
        return;
      }

      // Pre-fetch today's attendance to populate the markedPresentToday set
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('student_uuid')
        .eq('date', today);
        
      if (todayAttendance) {
        todayAttendance.forEach(a => markedPresentToday.current.add(a.student_uuid));
      }

      setLoadingMsg('Building face matcher...');
      // Build FaceMatcher
      const labeledDescriptors = [];
      for (const student of students) {
        if (student.face_descriptors && student.face_descriptors.length > 0) {
          try {
            const labeled = createLabeledDescriptors(student.id, student.full_name, student.face_descriptors);
            labeledDescriptors.push(labeled);
          } catch (e) {
            console.warn('Failed to parse descriptors for student:', student.full_name);
          }
        }
      }

      if (labeledDescriptors.length > 0) {
        const matcher = createFaceMatcher(labeledDescriptors);
        setFaceMatcher(matcher);
      } else {
        setMatchResult({ type: 'warning', message: 'No face profiles found. Add student photos first.' });
      }

      setLoadingMsg('');
    } catch (err) {
      console.error(err);
      setMatchResult({ type: 'error', message: err.message });
    }
  };

  const startCamera = async () => {
    try {
      setMatchResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setMatchResult({ type: 'error', message: 'Could not access camera. Please allow permissions.' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const handleVideoPlay = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !faceMatcher) return;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const interval = setInterval(async () => {
      if (!isCameraActive || video.paused || video.ended) {
        clearInterval(interval);
        return;
      }

      const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));

      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, { label: result.label === 'unknown' ? 'Unknown' : result.label.split(' - ')[1] });
        drawBox.draw(canvas);

        if (result.label !== 'unknown' && result.distance < 0.5) {
          // Matched! label format: "studentId - name"
          const studentUuid = result.label.split(' - ')[0];
          const studentName = result.label.split(' - ')[1];
          markAttendance(studentUuid, studentName);
        }
      });

    }, 500); // Check every 500ms
  };

  const markAttendance = async (studentUuid, studentName) => {
    if (markedPresentToday.current.has(studentUuid)) {
      return; // Already marked today
    }

    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0];

      // Insert record
      const { error } = await supabase.from('attendance').insert([
        {
          student_uuid: studentUuid,
          student_id: 'ID', // ideally fetch the actual ID, but it's optional for display
          student_name: studentName,
          date,
          time,
          status: 'Present'
        }
      ]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          markedPresentToday.current.add(studentUuid);
          return;
        }
        throw error;
      }

      markedPresentToday.current.add(studentUuid);
      setMatchResult({
        type: 'success',
        student: studentName,
        message: `Attendance marked successfully at ${time}`
      });

      // Clear success message after 3 seconds
      setTimeout(() => setMatchResult(null), 3000);

    } catch (err) {
      console.error('Error marking attendance:', err);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Scanner</h2>
          <p className="text-slate-400 mt-1">Real-time AI face recognition for attendance.</p>
        </div>
        
        {isCameraActive ? (
          <button onClick={stopCamera} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-xl font-medium transition-colors">
            Stop Camera
          </button>
        ) : (
          <button 
            onClick={startCamera} 
            disabled={!faceMatcher}
            className="bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/25 flex items-center space-x-2"
          >
            <Camera size={18} />
            <span>Start Scanner</span>
          </button>
        )}
      </div>

      {/* Match Result Alert */}
      {matchResult && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 shadow-lg animate-in slide-in-from-top-4 ${
          matchResult.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
          matchResult.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
          'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {matchResult.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <div>
            {matchResult.student && <p className="font-bold">{matchResult.student}</p>}
            <p className="text-sm">{matchResult.message}</p>
          </div>
        </div>
      )}

      {/* Scanner View */}
      <div className="flex-1 min-h-[500px] relative rounded-2xl border border-slate-800 bg-black overflow-hidden shadow-2xl flex items-center justify-center">
        {!isModelsLoaded || loadingMsg ? (
          <div className="text-center text-white flex flex-col items-center">
            <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
            <p className="font-medium text-lg">{loadingMsg}</p>
          </div>
        ) : !isCameraActive ? (
          <div className="text-center text-slate-500 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
              <Camera size={32} />
            </div>
            <p className="font-medium text-lg text-slate-300">Camera Offline</p>
            <p className="text-sm mt-1">Click "Start Scanner" to begin face recognition</p>
          </div>
        ) : null}

        <video
          ref={videoRef}
          onPlay={handleVideoPlay}
          className={`absolute top-0 left-0 w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className={`absolute top-0 left-0 w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
        />

        {/* Scanning overlay */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none border-4 border-indigo-500/30 rounded-2xl">
            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white text-xs font-medium tracking-wider uppercase">Live Analysis</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
