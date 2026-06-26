import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getFaceDescriptions, loadModels } from '../lib/faceApi';
import { useNotification } from '../components/NotificationProvider';
import { Plus, Search, Trash2, X, Upload, Loader2, Image as ImageIcon, Users, UserCircle2, Camera, CameraOff, Check, RotateCcw } from 'lucide-react';

export default function Students() {
  const { notify } = useNotification();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  // Modal & Registration state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', full_name: '', class_name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // id of student pending delete confirm

  const [isRegCameraActive, setIsRegCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [capturedCount, setCapturedCount] = useState(0);
  const [compressedProfilePhoto, setCompressedProfilePhoto] = useState(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState(null);
  const [registrationStep, setRegistrationStep] = useState('idle'); // idle | ready_to_start | capturing | done
  const [cameraLoading, setCameraLoading] = useState(false);

  const regVideoRef = useRef(null);
  const regCanvasRef = useRef(null);
  const regStreamRef = useRef(null);
  const captureLoopRef = useRef(null);
  const pendingStreamRef = useRef(null); // holds stream until video element mounts

  useEffect(() => {
    fetchStudents();
    loadModels().then(success => setModelsLoaded(success));
    return () => {
      if (captureLoopRef.current) cancelAnimationFrame(captureLoopRef.current);
      if (regStreamRef.current) {
        regStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // When isRegCameraActive becomes true, the video element renders into the DOM.
  // Assign the pending stream to it after re-render.
  useEffect(() => {
    if (isRegCameraActive && pendingStreamRef.current && regVideoRef.current) {
      regVideoRef.current.srcObject = pendingStreamRef.current;
      pendingStreamRef.current = null;
    }
  }, [isRegCameraActive]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      notify({ type: 'error', title: 'Error', message: 'Failed to load students.' });
    } finally {
      setLoading(false);
    }
  };

  const getCaptureInstruction = (count) => {
    if (count < 3) return "Look directly into the camera 😐";
    if (count < 6) return "Turn your head slightly left ⬅️";
    if (count < 9) return "Turn your head slightly right ➡️";
    return "Tilt your head up/down or smile 😊";
  };

  const drawStatusText = (ctx, text) => {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.font = '600 13px Inter, sans-serif';
    const metrics = ctx.measureText(text);
    const padding = 12;
    const bgWidth = metrics.width + padding * 2;
    const bgHeight = 28;
    const bgX = (ctx.canvas.width - bgWidth) / 2;
    const bgY = 12;
    
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 6) : ctx.rect(bgX, bgY, bgWidth, bgHeight);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, bgX + padding, bgY + 18);
  };

  const drawRegFaceBox = (ctx, box) => {
    const { x, y, width, height } = box;
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    const cornerSize = width * 0.15;
    
    ctx.beginPath();
    ctx.moveTo(x, y + cornerSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerSize, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + width - cornerSize, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + cornerSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + height - cornerSize);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + cornerSize, y + height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + width - cornerSize, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - cornerSize);
    ctx.stroke();
  };

  const cropAndCompressFace = (video, faceBox) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 250;
      canvas.height = 250;
      const ctx = canvas.getContext('2d');
      
      const { x, y, width, height } = faceBox;
      const padding = width * 0.25;
      
      const sx = Math.max(0, x - padding);
      const sy = Math.max(0, y - padding);
      const sWidth = Math.min(video.videoWidth - sx, width + padding * 2);
      const sHeight = Math.min(video.videoHeight - sy, height + padding * 2);
      
      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, 250, 250);
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.75);
    });
  };

  const startEnrollmentCamera = async () => {
    setCameraLoading(true);
    setError('');
    // Reset any previous capture state
    setCapturedCount(0);
    setCapturedDescriptors([]);
    setCompressedProfilePhoto(null);
    setProfilePhotoPreviewUrl(null);
    setRegistrationStep('idle');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      regStreamRef.current = stream;
      // Store stream in pendingStreamRef — the video element doesn't exist yet.
      // The useEffect above will attach it once React renders the video tag.
      pendingStreamRef.current = stream;
      setIsRegCameraActive(true);
      setRegistrationStep('ready_to_start');
    } catch (err) {
      console.error(err);
      let msg = 'Could not access camera.';
      if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow access in browser settings.';
      else if (err.name === 'NotFoundError') msg = 'No camera found on this device.';
      else if (err.name === 'NotReadableError') msg = 'Camera is already in use by another application.';
      setError(msg);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopEnrollmentCamera = () => {
    setIsRegCameraActive(false);
    setIsCapturing(false);
    if (captureLoopRef.current) {
      cancelAnimationFrame(captureLoopRef.current);
      captureLoopRef.current = null;
    }
    if (regStreamRef.current) {
      regStreamRef.current.getTracks().forEach(track => track.stop());
      regStreamRef.current = null;
    }
    if (regVideoRef.current) {
      regVideoRef.current.srcObject = null;
    }
  };

  const startCaptureSequence = () => {
    setIsCapturing(true);
    setCapturedCount(0);
    setRegistrationStep('capturing');
    
    let lastCheck = 0;
    const descriptorsCollected = [];

    const captureFrame = async () => {
      const video = regVideoRef.current;
      const canvas = regCanvasRef.current;
      if (!video || !canvas || !regStreamRef.current) return;

      if (video.paused || video.ended || video.readyState < 2) {
        captureLoopRef.current = requestAnimationFrame(captureFrame);
        return;
      }

      const now = Date.now();
      if (now - lastCheck < 300) {
        captureLoopRef.current = requestAnimationFrame(captureFrame);
        return;
      }
      lastCheck = now;

      try {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const detections = await getFaceDescriptions(video, true);
        
        if (detections.length === 0) {
          drawStatusText(ctx, "No face detected. Align your face.");
          captureLoopRef.current = requestAnimationFrame(captureFrame);
          return;
        }

        if (detections.length > 1) {
          drawStatusText(ctx, "Multiple faces detected!");
          captureLoopRef.current = requestAnimationFrame(captureFrame);
          return;
        }

        const face = detections[0];
        drawRegFaceBox(ctx, face.detection.box);

        descriptorsCollected.push(Array.from(face.descriptor));
        const newCount = descriptorsCollected.length;
        setCapturedCount(newCount);

        if (newCount === 1) {
          const croppedBlob = await cropAndCompressFace(video, face.detection.box);
          setCompressedProfilePhoto(croppedBlob);
          setProfilePhotoPreviewUrl(URL.createObjectURL(croppedBlob));
        }

        if (newCount >= 12) {
          setCapturedDescriptors(descriptorsCollected);
          setRegistrationStep('done');
          setIsCapturing(false);
          stopEnrollmentCamera();
          notify({ type: 'success', title: 'Face Enrolled', message: 'Successfully captured 12 face templates.' });
          return;
        }
      } catch (err) {
        console.error(err);
      }

      captureLoopRef.current = requestAnimationFrame(captureFrame);
    };

    captureLoopRef.current = requestAnimationFrame(captureFrame);
  };

  const uploadPhotoToStorage = async (blob, studentId) => {
    const fileName = `${studentId}_profile_${Math.random().toString(36).substring(7)}.jpg`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(filePath, blob, { contentType: 'image/jpeg' });

    if (uploadError) {
      console.warn('Storage upload failed (bucket might not exist). Skipping storage.', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('student-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (capturedDescriptors.length === 0) {
      setError('Please capture face samples before saving.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const photoUrls = [];
      if (compressedProfilePhoto) {
        const url = await uploadPhotoToStorage(compressedProfilePhoto, formData.student_id);
        if (url) photoUrls.push(url);
      }

      const { error: dbError } = await supabase.from('students').insert([
        {
          student_id: formData.student_id,
          full_name: formData.full_name,
          class_name: formData.class_name,
          face_descriptors: capturedDescriptors,
          photo_urls: photoUrls
        }
      ]);

      if (dbError) throw dbError;

      localStorage.removeItem('ai_attendance_students_cache');

      closeModal();
      notify({ type: 'success', title: 'Student Added', message: `${formData.full_name} registered successfully.` });
      fetchStudents();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to add student. Ensure student ID is unique.');
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (id, name) => {
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      
      localStorage.removeItem('ai_attendance_students_cache');
      setConfirmDeleteId(null);
      setStudents(prev => prev.filter(s => s.id !== id));
      notify({ type: 'success', title: 'Deleted', message: `${name} removed from the system.` });
    } catch (err) {
      console.error('Error deleting student:', err);
      setConfirmDeleteId(null);
      notify({ type: 'error', title: 'Delete Failed', message: err.message || 'Failed to delete student.' });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError('');
    stopEnrollmentCamera();
    setCompressedProfilePhoto(null);
    setProfilePhotoPreviewUrl(null);
    setCapturedDescriptors([]);
    setCapturedCount(0);
    setRegistrationStep('idle');
    setFormData({ student_id: '', full_name: '', class_name: '' });
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Students</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Manage registered students and their face data.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 h-10 sm:h-11 px-5 sm:px-6 shadow-lg shadow-indigo-500/25 transition-all gap-2 text-sm"
        >
          <Plus size={17} />
          <span>Add Student</span>
        </button>
      </div>

      {/* Summary + Search */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm"
          />
        </div>
        {!loading && (
          <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
            <Users size={15} className="text-indigo-500" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">{filteredStudents.length}</span>
            <span className="text-slate-400 dark:text-slate-500">students</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/50 dark:border-slate-700/50">
              <tr>
                <th className="px-5 sm:px-6 py-3.5 font-semibold">Student</th>
                <th className="px-5 sm:px-6 py-3.5 font-semibold">ID</th>
                <th className="px-5 sm:px-6 py-3.5 font-semibold">Class</th>
                <th className="px-5 sm:px-6 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 sm:px-6 py-4"><div className="w-28 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-5 sm:px-6 py-4"><div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-5 sm:px-6 py-4"><div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                    <td className="px-5 sm:px-6 py-4"><div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Users size={28} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">No students found.</p>
                      <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="text-indigo-500 hover:text-indigo-400 font-semibold text-sm transition-colors"
                      >
                        Add your first student →
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 sm:px-6 py-3.5">
                      <span className="font-semibold text-slate-900 dark:text-white">{student.full_name}</span>
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs">{student.student_id}</td>
                    <td className="px-5 sm:px-6 py-3.5">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-semibold">
                        {student.class_name}
                      </span>
                    </td>
                    <td className="px-5 sm:px-6 py-3.5 text-right">
                      {confirmDeleteId === student.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Delete?</span>
                          <button
                            onClick={() => deleteStudent(student.id, student.full_name)}
                            className="text-white bg-red-500 hover:bg-red-600 transition-colors px-2.5 py-1 rounded-lg text-xs font-semibold"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-2.5 py-1 rounded-lg text-xs font-semibold"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(student.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                          title="Delete Student"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Student</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Register face data for attendance scanning</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <form id="add-student-form" onSubmit={handleAddStudent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Student ID</label>
                  <input required type="text" value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" placeholder="e.g., STU001" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                  <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" placeholder="John Doe" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Class</label>
                  <input required type="text" value={formData.class_name} onChange={e => setFormData({...formData, class_name: e.target.value})} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" placeholder="Grade 10A" />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Face Registration Setup</label>
                  
                  {registrationStep === 'done' && profilePhotoPreviewUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                        <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0">
                          <img src={profilePhotoPreviewUrl} alt="Cropped profile" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1">
                            <Check size={16} /> Face Enrolled Successfully
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">12 face samples captured & embedded.</p>
                          <button
                            type="button"
                            onClick={startEnrollmentCamera}
                            className="mt-2 text-xs text-indigo-500 hover:text-indigo-400 font-semibold flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw size={12} /> Retake Registration
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : !isRegCameraActive ? (
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-xl p-6 text-center transition-all">
                      <Camera size={26} className="mx-auto mb-2.5 text-slate-400 dark:text-slate-500" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Live Camera Registration</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[280px] mx-auto">No static photos. Capture face features directly using your live webcam.</p>
                      <button
                        type="button"
                        onClick={startEnrollmentCamera}
                        disabled={cameraLoading}
                        className="mt-4 inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 font-semibold text-xs shadow-md transition-all gap-1.5"
                      >
                        {cameraLoading ? <><Loader2 size={12} className="animate-spin" /> Starting...</> : <><Camera size={14} /> Enable Camera</>}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Video capture card */}
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <video
                          ref={regVideoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <canvas
                          ref={regCanvasRef}
                          width={640}
                          height={480}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        
                        {/* Interactive overlay based on capture progress */}
                        {registrationStep === 'capturing' && (
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm px-4 py-2 text-center border-t border-white/10">
                            <p className="text-white text-xs font-semibold">{getCaptureInstruction(capturedCount)}</p>
                          </div>
                        )}
                      </div>

                      {/* Control Panel */}
                      <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {registrationStep === 'capturing' ? 'Capturing Samples...' : 'Align face in the frame'}
                          </span>
                          <span className="font-mono text-slate-400 dark:text-slate-500">
                            {capturedCount} / 12
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full transition-all duration-300"
                            style={{ width: `${(capturedCount / 12) * 100}%` }}
                          />
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            type="button"
                            onClick={stopEnrollmentCamera}
                            className="inline-flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 font-semibold text-xs transition-all gap-1"
                          >
                            <CameraOff size={13} /> Close
                          </button>
                          
                          {registrationStep === 'ready_to_start' && (
                            <button
                              type="button"
                              onClick={startCaptureSequence}
                              className="inline-flex items-center justify-center bg-indigo-600 text-white rounded-lg px-4 py-1.5 font-semibold text-xs shadow-sm hover:bg-indigo-500 transition-all gap-1.5"
                            >
                              <Camera size={13} /> Start Capture
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="add-student-form"
                disabled={saving || !modelsLoaded || registrationStep !== 'done'}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 text-sm"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</>
                ) : !modelsLoaded ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> Loading AI...</>
                ) : registrationStep !== 'done' ? (
                  'Awaiting Enrollment'
                ) : (
                  'Save Student'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
