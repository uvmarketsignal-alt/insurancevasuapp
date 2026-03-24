import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mail, Phone, Shield, Check, X, Camera, Pencil, Upload, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { uploadAvatarFile, isServerSyncEnabled } from '../lib/api';

// ── Avatar Helper ───────────────────────────────────────────────────────────
function Avatar({ url, name, size = 'md' }: { url?: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base';
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border-2 border-white shadow`}
        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`; }}
      />
    );
  }
  return (
    <div className={`${sizeClass} bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center`}>
      <span className="text-white font-bold">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

// ── Photo Picker ────────────────────────────────────────────────────────────
function PhotoPicker({
  preview,
  onFileSelected,
}: {
  preview: string | null;
  onFileSelected: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {preview ? (
          <img src={preview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 shadow" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-4 border-blue-100">
            <Camera className="w-8 h-8 text-slate-400" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Camera className="w-3.5 h-3.5" /> Camera
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, toggleEmployeeStatus, tenant } = useStore();

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState<File | null>(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    employee_code: '',
    department: ''
  });

  // Edit modal state
  const [editTarget, setEditTarget] = useState<(typeof employees)[0] | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    employee_code: '',
    department: '',
    email: '',
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddPhotoSelected = (file: File) => {
    setAddingPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setAddPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddEmployee = async () => {
    if (!tenant) return;
    if (!formData.email || !formData.full_name) {
      alert('Email and Full Name are required.');
      return;
    }
    setAdding(true);
    try {
      let avatar_url: string | undefined = undefined;
      if (addingPhoto && isServerSyncEnabled()) {
        const url = await uploadAvatarFile(addingPhoto);
        if (url) avatar_url = url;
      } else if (addPhotoPreview) {
        // Fallback: store data URL locally if blob not configured
        avatar_url = addPhotoPreview;
      }

      await addEmployee({
        id: `emp_${Date.now()}`,
        tenant_id: tenant.id,
        email: formData.email,
        password: formData.password || 'ChangeMe@123',
        role: 'employee',
        is_active: true,
        name: formData.name || formData.email.split('@')[0],
        created_at: new Date(),
        updated_at: new Date(),
        profile: {
          id: `prof_${Date.now()}`,
          tenant_id: tenant.id,
          full_name: formData.full_name || formData.name,
          phone: formData.phone,
          avatar_url,
          employee_code: formData.employee_code,
          department: formData.department,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      } as any);

      setFormData({ name: '', email: '', password: '', full_name: '', phone: '', employee_code: '', department: '' });
      setAddingPhoto(null);
      setAddPhotoPreview(null);
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (employee: (typeof employees)[0]) => {
    setEditTarget(employee);
    setEditForm({
      full_name: employee.profile.full_name,
      phone: employee.profile.phone || '',
      employee_code: employee.profile.employee_code || '',
      department: employee.profile.department || '',
      email: employee.email,
    });
    setEditingPhoto(null);
    setEditPhotoPreview(employee.profile.avatar_url || null);
  };

  const handleEditPhotoSelected = (file: File) => {
    setEditingPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setEditPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      let avatar_url: string | undefined = editTarget.profile.avatar_url;

      if (editingPhoto) {
        if (isServerSyncEnabled()) {
          const url = await uploadAvatarFile(editingPhoto);
          if (url) avatar_url = url;
        } else if (editPhotoPreview) {
          avatar_url = editPhotoPreview;
        }
      }

      await updateEmployee(
        editTarget.id,
        { email: editForm.email },
        {
          full_name: editForm.full_name,
          phone: editForm.phone,
          employee_code: editForm.employee_code,
          department: editForm.department,
          avatar_url,
        }
      );

      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-slate-600 mt-1">Manage your team members and their access</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </motion.button>
      </div>

      {/* Add Employee Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 p-6"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Add New Employee</h2>

            {/* Photo */}
            <div className="mb-6 flex justify-center">
              <PhotoPicker preview={addPhotoPreview} onFileSelected={handleAddPhotoSelected} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Username', key: 'name', type: 'text', placeholder: 'Enter username' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'Enter email' },
                { label: 'Password', key: 'password', type: 'password', placeholder: 'Initial password' },
                { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Enter full name' },
                { label: 'Phone', key: 'phone', type: 'tel', placeholder: 'Enter phone number' },
                { label: 'Employee Code', key: 'employee_code', type: 'text', placeholder: 'e.g. EMP-003' },
                { label: 'Department', key: 'department', type: 'text', placeholder: 'e.g. Sales' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
                  <input
                    type={type}
                    value={(formData as any)[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowAddForm(false); setAddPhotoPreview(null); setAddingPhoto(null); }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmployee}
                disabled={adding}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                {adding ? 'Adding…' : 'Add Employee'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employees List */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Team Members ({employees.length})</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {employees.length > 0 ? (
            employees.map((employee) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar
                      url={employee.profile.avatar_url}
                      name={employee.profile.full_name}
                      size="md"
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900">{employee.profile.full_name}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        <Mail className="inline w-3 h-3 mr-1" />
                        {employee.email}
                      </p>
                      <p className="text-sm text-slate-600">
                        <Phone className="inline w-3 h-3 mr-1" />
                        {employee.profile.phone || 'No phone'}
                      </p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {employee.profile.employee_code && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {employee.profile.employee_code}
                          </span>
                        )}
                        {employee.profile.department && (
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            {employee.profile.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-2">
                      <Shield className={`w-4 h-4 ${employee.role === 'employee' ? 'text-blue-600' : 'text-purple-600'}`} />
                      <span className={`text-sm font-medium ${employee.role === 'employee' ? 'text-blue-600' : 'text-purple-600'}`}>
                        {employee.role === 'employee' ? 'Employee' : 'Owner'}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.is_active ? (
                        <><Check className="w-3 h-3 mr-1" />Active</>
                      ) : (
                        <><X className="w-3 h-3 mr-1" />Inactive</>
                      )}
                    </span>
                    <p className="text-xs text-slate-500 mt-2">
                      Joined {format(new Date(employee.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  {employee.role === 'employee' && (
                    <button
                      onClick={() => toggleEmployeeStatus(employee.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        employee.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {employee.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(employee)}
                    className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit Profile
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-500">
              No employees found. Add your first team member!
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setEditTarget(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Edit Employee Profile</h2>
                <button onClick={() => setEditTarget(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Photo */}
              <div className="mb-6 flex justify-center">
                <PhotoPicker preview={editPhotoPreview} onFileSelected={handleEditPhotoSelected} />
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Full Name', key: 'full_name', type: 'text' },
                  { label: 'Email', key: 'email', type: 'email' },
                  { label: 'Phone', key: 'phone', type: 'tel' },
                  { label: 'Employee Code', key: 'employee_code', type: 'text' },
                  { label: 'Department', key: 'department', type: 'text' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                    <input
                      type={type}
                      value={(editForm as any)[key]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>

              {!isServerSyncEnabled() && (
                <p className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Server sync not configured — photo will be stored locally only.
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}