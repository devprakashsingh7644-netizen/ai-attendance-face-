import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getFaceDescriptions } from '../lib/faceApi';
import { Plus, Search, Trash2, X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', full_name: '', class_name: '' });
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchStudents();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (photos.length + filesArray.length > 5) {
        setError('Maximum 5 photos allowed.');
        return;
      }
      setError('');
      setPhotos(prev => [...prev, ...filesArray]);
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const processImageForFace = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const detections = await getFaceDescriptions(img);
          if (detections.length === 0) {
            reject(new Error(`No face detected in one of the images.`));
          } else if (detections.length > 1) {
            reject(new Error(`Multiple faces detected in one of the images. Please use images with only the student's face.`));
          } else {
            // Convert Float32Array to regular array for JSON storage
            resolve(Array.from(detections[0].descriptor));
          }
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadPhotoToStorage = async (file, studentId) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${studentId}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(filePath, file);

    if (uploadError) {
      console.warn('Storage upload failed (bucket might not exist). Skipping storage.', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('student-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (photos.length === 0) {
      setError('Please upload at least 1 photo for face recognition.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Process all images to get face descriptors
      const descriptors = [];
      for (const photo of photos) {
        const descriptor = await processImageForFace(photo);
        descriptors.push(descriptor);
      }

      // 2. Upload images to Supabase Storage
      const photoUrls = [];
      for (const photo of photos) {
        const url = await uploadPhotoToStorage(photo, formData.student_id);
        if (url) photoUrls.push(url);
      }

      // 3. Save to database
      const { error: dbError } = await supabase.from('students').insert([
        {
          student_id: formData.student_id,
          full_name: formData.full_name,
          class_name: formData.class_name,
          face_descriptors: descriptors,
          photo_urls: photoUrls
        }
      ]);

      if (dbError) throw dbError;

      // Success
      setIsModalOpen(false);
      setFormData({ student_id: '', full_name: '', class_name: '' });
      setPhotos([]);
      fetchStudents();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to add student. Ensure student ID is unique.');
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      setStudents(students.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Failed to delete student.');
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Students</h2>
          <p className="text-slate-400 mt-1">Manage registered students and their face data.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 h-11 px-6 shadow-lg shadow-indigo-500/25 transition-all space-x-2"
        >
          <Plus size={18} />
          <span>Add Student</span>
        </button>
      </div>
      
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Search by name or ID..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Class</th>
                <th className="px-6 py-4 font-medium">Photos</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading students...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                      <Users size={32} className="text-slate-600 mb-2" />
                      <p>No students found.</p>
                      <button onClick={() => setIsModalOpen(true)} className="text-indigo-400 hover:text-indigo-300 font-medium">
                        Add your first student
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{student.full_name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{student.student_id}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-xs font-medium">
                        {student.class_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1 text-slate-400 text-xs">
                        <ImageIcon size={14} />
                        <span>{student.face_descriptors?.length || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteStudent(student.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-slate-800"
                        title="Delete Student"
                      >
                        <Trash2 size={18} />
                      </button>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
              <h3 className="text-xl font-bold text-white">Add New Student</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {error && (
                <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form id="add-student-form" onSubmit={handleAddStudent} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Student ID</label>
                  <input required type="text" value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., STU001" />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Full Name</label>
                  <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Class</label>
                  <input required type="text" value={formData.class_name} onChange={e => setFormData({...formData, class_name: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Grade 10A" />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-sm font-medium text-slate-300">Face Photos (1-5 images)</label>
                  
                  {/* Photo previews */}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mb-2">
                      {photos.map((file, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                          <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photos.length >= 5}
                    className="w-full border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload size={24} className="mb-2" />
                    <span className="text-sm font-medium">Click to select photos</span>
                    <span className="text-xs mt-1">JPEG/PNG up to 5MB</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoSelect} 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 shrink-0 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="add-student-form"
                disabled={saving}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
              >
                {saving ? (
                  <><Loader2 size={18} className="animate-spin mr-2" /> Saving...</>
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
