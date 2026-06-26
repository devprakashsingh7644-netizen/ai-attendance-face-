import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { loadModels, createFaceMatcher, createLabeledDescriptors } from '../lib/faceApi';
import * as faceapi from 'face-api.js';
import { Camera, AlertCircle, User, Loader2, CameraOff, Wifi, WifiOff, Clock } from 'lucide-react';
import { useNotification } from '../components/NotificationProvider';

// ===== Inline base64 success sound (short ding) =====
const SUCCESS_SOUND_B64 = 'data:audio/wav;base64,UklGRl4GAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToGAAAAAP//AgADAP7/AAACAAEAAAABAAEAAgACAP//AAD+/wAA//8AAAEAAAD+/wAAAAABAAAAAQD//wAAAQABAAEAAAAAAAAAAAAAAP////8AAAAAAQABAAAAAAD//wAAAAAAAQAAAP//AAAAAAEAAAD//wAA//8AAAAAAQAAAP//AAD//wAAAAAAAAEA//8AAAAAAAABAAEA//8AAAAAAAD//wAAAQAAAP//AAAAAP//AAABAAAA//8AAAEAAQAAAP//AAD//wAAAQAAAAAAAAAAAAAAAAAAAQD//wAA//8AAAEAAAAAAAAA//8AAAAAAAABAAEA//8AAAAAAQD//wAAAQAAAAAAAAD//wAAAAABAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAP//AAD//wAAAAAAAAAAAQAAAAAA//8AAAAAAQD//wAA//8AAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAAAAAAAAAAAAQADAAYABwAHAAYABQAFAAUABgAIAAkACgAKAAkACQAJAAoADAANAA8AEQARABIAEwAWABkAGwAcABwAGgAYABYAFgAYABkAGgAbABsAGQAXABQAEgARABEAEQARABAADwAOAAwACwAKAAkACAAIAAgACAAIAAgABwAGAAYABgAFAAQABAACAAEAAQAAAAAAAAAAAAAAAAAAAAEAAQABAAEAAQACAAIAAgACAAIAAQABAAEAAQABAAIABAAHAAwAEgAYAB4AJAApAC4AMwA2ADkAPABBAEcATQBRAFMAUgBPAEoARABAAD8APgA8ADoAOAA0AC8AKgAlACEAHgAbABgAFQARAA0ACQAFAAIAAAAAAAEAAwAEAAUABQAFAAMAAgAAAAAAAAAAAAEAAAAAAAAA//8AAAEAAQABAP//AAD//wAAAQABAAEAAQABAAAAAAAAAAAAAQABAAIA//8AAAIABQAJAA4AEwAXABsAHwAkACkALgAzADkAPgBDAEgATQBSAFQAUwBRAE0ASABDAEAAPwA+ADsAOAA0ADAAKwAmACEAHgAbABgAFQARAA0ACQAFAAIAAAAAAAIABAAFAAUABQADAAIAAQAAAAAAAAABAP//AAAA//8AAAEAAQAAAP//AAABAP//AAABAAIAAQABAAAAAAAAAAAAAAIAAQAB//8AAAIABgAKAA8AEwAXABoAHgAjACgALgA0ADoAPwBDAEcATABRAFQAUwBRAE4ASABDAEAAPwA+ADwAOQA2ADIALQAnACIAHwAbABgAFQARAA0ACQAFAAIAAAAAAAIABAAFAAUABQADAAIAAAD//wAAAAABAAAAAAAA//8AAAEAAQABAP//AAD//wAAAAEAAQABAAEAAAAAAAAAAAAAAAEAAQABAAAA//8AAAIABQAJAAoACQAHAAQAAQD+//z/+//8//3//v8AAAIABAAHAAYABQACAP//+//3//T/8v/y//P/9P/2//r//f8AAAIAAgABAP7/+v/3//T/8v/x//L/8//1//j/+//+/wAAAgACAAEA/v/7//j/9f/z//L/8v/z//X/+P/7//7/AAACAAIAAQD+//v/+P/1//P/8v/y//P/9f/4//v//v8AAAIAAgABAP7/+//4//X/8//y//L/8//1//j/+//+/wAAAgACAAEA/v/7//j/9f/z//L/8v/z//X/+P/7//7/AAACAAIAAQD+//v/+P/2//T/8//z//T/9v/4//v//v8AAAEAAQAAAP7//P/6//j/9//3//f/+P/5//v//f///wAAAQABAAAAAP///v/9//z/+//7//v//P/9//7///8AAAAAAAAAAAAA//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAA';

function playSuccessSound() {
  try {
    const audio = new Audio(SUCCESS_SOUND_B64);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch {}
}

// ===== Animated Checkmark SVG Component =====
function AnimatedCheckmark() {
  return (
    <svg className="w-20 h-20" viewBox="0 0 52 52">
      <circle className="checkmark-circle" cx="26" cy="26" r="24" />
      <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
    </svg>
  );
}

// ===== Success Popup Modal =====
function SuccessPopup({ student, time, onClose }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative glass-card rounded-3xl p-8 max-w-sm w-full text-center animate-bounce-in shadow-2xl">
        {/* Countdown ring */}
        <div className="absolute top-4 right-4">
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" strokeWidth="2"
                className="text-slate-200 dark:text-slate-700" stroke="currentColor" />
              <circle cx="16" cy="16" r="13" fill="none" strokeWidth="2"
                className="text-emerald-500" stroke="currentColor"
                strokeLinecap="round"
                strokeDasharray="81.68"
                strokeDashoffset={81.68 - (81.68 * countdown / 3)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {countdown}
            </span>
          </div>
        </div>

        {/* Checkmark */}
        <div className="flex justify-center mb-5">
          <AnimatedCheckmark />
        </div>

        {/* Student Avatar */}
        {student.photoUrl ? (
          <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden border-4 border-emerald-500/30 shadow-lg shadow-emerald-500/20">
            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center border-4 border-emerald-500/30 shadow-lg shadow-emerald-500/20">
            <span className="text-white text-2xl font-bold">{student.name?.charAt(0)?.toUpperCase()}</span>
          </div>
        )}

        {/* Student Info */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{student.name}</h3>
        <div className="flex flex-col items-center gap-0.5 mb-2 text-xs">
          {student.studentId && (
            <p className="font-mono text-slate-500 dark:text-slate-400">ID: {student.studentId}</p>
          )}
          {student.className && (
            <p className="font-semibold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full mt-1">Class: {student.className}</p>
          )}
          {student.confidence && (
            <p className="text-slate-400 mt-1">Confidence: <span className="font-semibold text-emerald-500">{student.confidence}%</span></p>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-medium">
          <Clock size={12} className="inline mr-1" />
          {time}
        </p>

        {/* Success Message */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
            ✅ Attendance Recorded Successfully
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== Brightness analysis helper =====
const checkFaceBrightness = (video, box) => {
  try {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 50;
    tempCanvas.height = 50;
    const tempCtx = tempCanvas.getContext('2d');
    
    const { x, y, width, height } = box;
    tempCtx.drawImage(
      video, 
      Math.max(0, x), 
      Math.max(0, y), 
      Math.min(video.videoWidth, width), 
      Math.min(video.videoHeight, height), 
      0, 
      0, 
      50, 
      50
    );
    const imgData = tempCtx.getImageData(0, 0, 50, 50);
    let total = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
      total += (0.2126 * imgData.data[i] + 0.7152 * imgData.data[i+1] + 0.0722 * imgData.data[i+2]);
    }
    return total / (imgData.data.length / 4);
  } catch {
    return 128;
  }
};

// ===== Scanner Status Badge =====
function StatusBadge({ status }) {
  const configs = {
    ready: { label: 'Ready', dot: 'ready', color: 'text-emerald-400' },
    scanning: { label: 'Scanning', dot: 'scanning', color: 'text-amber-400' },
    recognized: { label: 'Recognized', dot: 'recognized', color: 'text-blue-400' },
    'not-found': { label: 'Face Not Found', dot: 'not-found', color: 'text-red-400' },
    offline: { label: 'Offline', dot: 'not-found', color: 'text-slate-400' },
    loading: { label: 'Loading...', dot: 'scanning', color: 'text-amber-400' },
  };
  const cfg = configs[status] || configs.offline;

  return (
    <div className="status-badge">
      <span className={`status-dot ${cfg.dot} ${status === 'scanning' || status === 'loading' ? 'animate-pulse' : ''}`} />
      <span className={`${cfg.color} text-white`}>{cfg.label}</span>
    </div>
  );
}


export default function Scanner() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const { notify } = useNotification();
  
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState('Initializing scanner...');
  const [scannerStatus, setScannerStatus] = useState('loading'); // ready|scanning|recognized|not-found|offline|loading
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dbConnected, setDbConnected] = useState(false);
  const [confidenceInfo, setConfidenceInfo] = useState(null); // { name, confidence }
  const [isLowLight, setIsLowLight] = useState(false);
  
  // Success popup state
  const [successPopup, setSuccessPopup] = useState(null); // { name, studentId, className, photoUrl, confidence, time }

  // Students data for photo lookup
  const studentsDataRef = useRef([]);

  // Refs for interval/loop
  const isCameraActiveRef = useRef(false);
  const faceMatcherRef = useRef(null);
  const scanLoopRef = useRef(null);
  const markedPresentToday = useRef(new Set());
  const lastDetectionTime = useRef(0);

  useEffect(() => {
    initScanner();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(timer);
      stopCamera();
    };
  }, []);

  const initScanner = async () => {
    try {
      setScannerStatus('loading');
      setLoadingMsg('Loading AI models...');
      const loaded = await loadModels();
      if (!loaded) throw new Error('Failed to load AI models');
      setIsModelsLoaded(true);

      setLoadingMsg('Fetching student data...');
      let students = [];
      const cached = localStorage.getItem('ai_attendance_students_cache');
      if (cached) {
        try {
          students = JSON.parse(cached);
          console.log('Loaded students from local cache');
        } catch (e) {
          console.warn('Failed to parse cached student data', e);
        }
      }
      
      if (students.length === 0) {
        const { data, error } = await supabase.from('students').select('*');
        if (error) throw error;
        students = data || [];
        localStorage.setItem('ai_attendance_students_cache', JSON.stringify(students));
      }
      
      setDbConnected(true);
      studentsDataRef.current = students;

      if (students.length === 0) {
        notify({ type: 'warning', title: 'No Students', message: 'No students found. Please add students first.' });
        setLoadingMsg('');
        setScannerStatus('offline');
        return;
      }

      // Pre-fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('student_uuid')
        .eq('date', today);
      if (todayAttendance) {
        todayAttendance.forEach(a => markedPresentToday.current.add(a.student_uuid));
      }

      setLoadingMsg('Building face matcher...');
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
        faceMatcherRef.current = matcher;
        setLoadingMsg('');
        
        // Auto-start scanner
        startCamera();
      } else {
        setLoadingMsg('');
        setScannerStatus('offline');
        notify({ type: 'warning', title: 'No Face Profiles', message: 'Add student photos first.' });
      }
    } catch (err) {
      console.error(err);
      setLoadingMsg('');
      setScannerStatus('offline');
      notify({ type: 'error', title: 'Scanner Error', message: err.message });
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        isCameraActiveRef.current = true;
        setIsCameraActive(true);
        setScannerStatus('ready');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      let msg = 'Could not access camera.';
      if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow camera access in browser settings.';
      else if (err.name === 'NotFoundError') msg = 'No camera found on this device.';
      else if (err.name === 'NotReadableError') msg = 'Camera is in use by another application.';
      notify({ type: 'error', title: 'Camera Error', message: msg });
    }
  };

  const stopCamera = () => {
    isCameraActiveRef.current = false;
    setIsCameraActive(false);
    setScannerStatus('offline');
    setConfidenceInfo(null);
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    faceapi.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight });
  };

  const handleVideoPlay = () => {
    startScanLoop();
  };

  const drawFaceBox = useCallback((ctx, box, isKnown, label, confidence) => {
    const { x, y, width, height } = box;
    const color = isKnown ? '#22c55e' : '#ef4444';
    const cornerSize = Math.min(width, height) * 0.2;
    const lineWidth = 3;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + cornerSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerSize, y);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + width - cornerSize, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + height - cornerSize);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + cornerSize, y + height);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + width - cornerSize, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - cornerSize);
    ctx.stroke();

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = color + '40';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 4, y - 4, width + 8, height + 8);
    ctx.shadowBlur = 0;

    // Label background
    const fontSize = Math.max(12, Math.min(16, width * 0.08));
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    const text = isKnown ? `${label} — ${confidence}%` : 'Unknown';
    const textMetrics = ctx.measureText(text);
    const padding = 8;
    const bgHeight = fontSize + padding * 2;
    const bgWidth = textMetrics.width + padding * 2;
    const bgX = x;
    const bgY = y - bgHeight - 6;

    // Rounded label background
    const radius = 8;
    ctx.fillStyle = color + 'DD';
    ctx.beginPath();
    ctx.moveTo(bgX + radius, bgY);
    ctx.lineTo(bgX + bgWidth - radius, bgY);
    ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
    ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
    ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight);
    ctx.lineTo(bgX + radius, bgY + bgHeight);
    ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
    ctx.lineTo(bgX, bgY + radius);
    ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
    ctx.fill();

    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, bgX + padding, bgY + fontSize + padding * 0.5);
  }, []);

  const startScanLoop = () => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);

    const scanFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const matcher = faceMatcherRef.current;

      if (!isCameraActiveRef.current || !video || !canvas || !matcher) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      if (video.paused || video.ended || video.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Throttle detection to every ~300ms
      const now = Date.now();
      if (now - lastDetectionTime.current < 300) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      lastDetectionTime.current = now;

      try {
        const displaySize = { width: video.videoWidth, height: video.videoHeight };

        // Analyze frames using the lightweight TinyFaceDetector
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        const detections = await faceapi
          .detectAllFaces(video, options)
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (resizedDetections.length === 0) {
          if (isCameraActiveRef.current) setScannerStatus('ready');
          setConfidenceInfo(null);
          setIsLowLight(false);
          scanLoopRef.current = requestAnimationFrame(scanFrame);
          return;
        }

        // Assess brightness of the closest face
        const mainBox = resizedDetections[0].detection.box;
        const avgLuminance = checkFaceBrightness(video, mainBox);
        setIsLowLight(avgLuminance < 60);

        setScannerStatus('scanning');

        // Sort detections by area descending (largest/closest face first)
        const sortedDetections = [...resizedDetections].sort((a, b) => {
          const areaA = a.detection.box.width * a.detection.box.height;
          const areaB = b.detection.box.width * b.detection.box.height;
          return areaB - areaA;
        });

        const results = sortedDetections.map(d => matcher.findBestMatch(d.descriptor));

        results.forEach((result, i) => {
          const box = sortedDetections[i].detection.box;
          const isKnown = result.label !== 'unknown' && result.distance < 0.5;
          const name = isKnown ? result.label.split(' - ')[1] : 'Unknown';
          const confidence = Math.round((1 - result.distance) * 100);

          drawFaceBox(ctx, box, isKnown, name, confidence);

          // Only submit/identify the primary subject
          if (i === 0) {
            if (isKnown) {
              setScannerStatus('recognized');
              setConfidenceInfo({ name, confidence });
              const studentUuid = result.label.split(' - ')[0];
              markAttendance(studentUuid, name, confidence);
            } else {
              setScannerStatus('not-found');
              setConfidenceInfo(null);
            }
          }
        });
      } catch (err) {
        // Silently continue
      }

      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);
  };

  const markAttendance = async (studentUuid, studentName, confidence) => {
    if (markedPresentToday.current.has(studentUuid)) return;

    markedPresentToday.current.add(studentUuid);

    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0];

      const { error } = await supabase.from('attendance').insert([
        {
          student_uuid: studentUuid,
          student_id: studentUuid,
          student_name: studentName,
          date,
          time,
          status: 'Present'
        }
      ]);

      if (error) {
        if (error.code === '23505') {
          notify({ type: 'warning', title: 'Duplicate', message: `${studentName} already marked present today.` });
          return;
        }
        throw error;
      }

      // Find student metadata
      const studentData = studentsDataRef.current.find(s => s.id === studentUuid);
      const photoUrl = studentData?.photo_urls?.[0] || null;
      const studentId = studentData?.student_id || '';
      const className = studentData?.class_name || 'N/A';

      // Play success sound
      playSuccessSound();

      // Show success popup with all required variables
      setSuccessPopup({
        name: studentName,
        studentId,
        className,
        photoUrl,
        confidence,
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });

      // Show toast alert
      notify({
        type: 'success',
        title: 'Attendance Marked',
        message: `${studentName} marked present at ${time}`,
      });

    } catch (err) {
      console.error('Error marking attendance:', err);
      markedPresentToday.current.delete(studentUuid);
      notify({ type: 'error', title: 'Error', message: 'Failed to mark attendance. Please try again.' });
    }
  };

  return (
    <div className="h-full flex flex-col gap-5 sm:gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in-up">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Face Scanner
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Real-time AI face recognition for attendance.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Date/Time */}
          <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
            <Clock size={14} className="text-indigo-500" />
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">
              {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* DB Status */}
          <div className="glass-card rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
            {dbConnected ? (
              <><Wifi size={14} className="text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400 font-medium hidden sm:inline">Connected</span></>
            ) : (
              <><WifiOff size={14} className="text-red-400" /><span className="text-red-400 font-medium hidden sm:inline">Offline</span></>
            )}
          </div>

          {/* Camera Button */}
          {isCameraActive ? (
            <button
              onClick={stopCamera}
              className="bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-xl font-semibold transition-all border border-red-500/20 text-sm flex items-center gap-2"
            >
              <CameraOff size={16} />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={!faceMatcher && !loadingMsg}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 text-sm flex items-center gap-2"
            >
              <Camera size={16} />
              <span className="hidden sm:inline">Start Scanner</span>
            </button>
          )}
        </div>
      </div>

      {/* Scanner Card */}
      <div className="flex-1 min-h-[400px] sm:min-h-[500px] relative rounded-2xl overflow-hidden glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {/* Loading State */}
        {loadingMsg ? (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-50 dark:bg-slate-900">
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-16 h-16">
                <div className="w-16 h-16 rounded-full border-[3px] border-indigo-500/20 border-t-indigo-500 animate-spin" />
              </div>
              <p className="font-medium text-sm text-slate-600 dark:text-slate-300">{loadingMsg}</p>
            </div>
          </div>
        ) : !isCameraActive ? (
          /* Camera Off State */
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-50 dark:bg-slate-900/80">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto">
                <Camera size={36} className="text-slate-300 dark:text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Camera Offline</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  {faceMatcher
                    ? 'Click "Start Scanner" to begin face recognition'
                    : 'Add students with face photos first'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Video & Canvas */}
        <video
          ref={videoRef}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handleVideoPlay}
          autoPlay
          muted
          playsInline
          className={`absolute top-0 left-0 w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
        />
        <canvas
          ref={canvasRef}
          className={`absolute top-0 left-0 w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
        />

        {/* Scanner Overlay (when camera active) */}
        {isCameraActive && (
          <>
            {/* Corner Brackets */}
            <div className="scanner-frame">
              <div className="scanner-corner top-left" />
              <div className="scanner-corner top-right" />
              <div className="scanner-corner bottom-left" />
              <div className="scanner-corner bottom-right" />
            </div>

            {/* Scanning Line */}
            <div className="scan-line" />

            {/* Status Badge */}
            <div className="absolute top-4 left-4 z-20">
              <StatusBadge status={scannerStatus} />
            </div>

            {/* Confidence Display */}
            {confidenceInfo && (
              <div className="absolute top-4 right-4 z-20">
                <div className="status-badge">
                  <User size={14} className="text-emerald-400" />
                  <span className="text-white">
                    {confidenceInfo.name} — <span className="font-mono">{confidenceInfo.confidence}%</span>
                  </span>
                </div>
              </div>
            )}

            {/* Low light warning banner */}
            {isLowLight && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-red-500/90 text-white text-xs px-4 py-2 rounded-xl border border-red-500/20 backdrop-blur shadow-md font-semibold animate-pulse flex items-center gap-1.5">
                  <AlertCircle size={14} /> Low Light Detected. Ensure face is well-lit.
                </div>
              </div>
            )}

            {/* Scanning indicator when processing */}
            {scannerStatus === 'scanning' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                <div className="status-badge">
                  <Loader2 size={14} className="animate-spin text-amber-400" />
                  <span className="text-white">Scanning Face...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Success Popup */}
      {successPopup && (
        <SuccessPopup
          student={successPopup}
          time={successPopup.time}
          onClose={() => setSuccessPopup(null)}
        />
      )}
    </div>
  );
}
