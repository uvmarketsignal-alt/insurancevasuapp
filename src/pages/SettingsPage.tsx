import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Database, Moon, Sun, Shield, Bell, Upload, Save, CheckCircle, Wifi, WifiOff, Phone, Mail, MapPin, Hash } from 'lucide-react';
import { useStore } from '../store';
import { dbService } from '../lib/db-service';

export default function SettingsPage() {
  const { tenant, darkMode, setDarkMode, appSettings, updateAppSettings } = useStore();
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [newAppName, setNewAppName] = useState(appSettings.app_name);
  const [logoPreview, setLogoPreview] = useState<string>(appSettings.logo_url || '');
  const [whatsappNumber, setWhatsappNumber] = useState(appSettings.whatsapp_number || '');
  const [agencyEmail, setAgencyEmail] = useState(appSettings.agency_email || '');
  const [agencyAddress, setAgencyAddress] = useState(appSettings.agency_address || '');
  const [irdaiLicense, setIrdaiLicense] = useState(appSettings.irdai_license || '');
  const [primaryColor, setPrimaryColor] = useState(appSettings.primary_color);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    checkDb();
  }, []);

  const checkDb = async () => {
    setDbStatus('checking');
    try {
      const ok = await dbService.healthCheck();
      setDbStatus(ok ? 'connected' : 'disconnected');
    } catch {
      setDbStatus('disconnected');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setLogoPreview(url);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (tenant?.role !== 'owner') return;
    await updateAppSettings({
      app_name: newAppName,
      logo_url: logoPreview || undefined,
      whatsapp_number: whatsappNumber,
      agency_email: agencyEmail,
      agency_address: agencyAddress,
      irdai_license: irdaiLicense,
      primary_color: primaryColor,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-slate-600" /> Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage application preferences and branding</p>
      </div>

      {/* App Branding (Owner Only) */}
      {tenant?.role === 'owner' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur rounded-2xl shadow border border-white/20 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" /> App Branding
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">App Logo</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-20 h-20 object-contain rounded-2xl border border-slate-200 shadow" />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg">UV</div>
                )}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">Upload New Logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {logoPreview && (
                    <button onClick={() => setLogoPreview('')} className="text-sm text-red-600 hover:text-red-800 block">Remove Logo</button>
                  )}
                  <p className="text-xs text-slate-400">PNG, JPG, SVG up to 2MB. Recommended: 200×200px</p>
                </div>
              </div>
            </div>

            {/* App Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">App / Agency Name</label>
              <input type="text" value={newAppName} onChange={e => setNewAppName(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>

            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer" />
                <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-green-600" /> WhatsApp Number
              </label>
              <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-600" /> Agency Email
              </label>
              <input type="email" value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)}
                placeholder="agency@example.com"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>

            {/* IRDAI */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-purple-600" /> IRDAI License No.
              </label>
              <input type="text" value={irdaiLicense} onChange={e => setIrdaiLicense(e.target.value)}
                placeholder="IRDAI-AGT-2024-XXXXX"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" /> Agency Address
              </label>
              <input type="text" value={agencyAddress} onChange={e => setAgencyAddress(e.target.value)}
                placeholder="Full agency address"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>

          <button onClick={handleSave}
            className={`mt-6 px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm ${saved ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'}`}>
            {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </motion.div>
      )}

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur rounded-2xl shadow border border-white/20 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-500" /> Appearance
        </h2>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-5 h-5 text-blue-600" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <div>
              <p className="font-medium text-slate-900">Dark Mode</p>
              <p className="text-sm text-slate-500">Switch between light and dark theme</p>
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </motion.div>

      {/* Database Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white/80 backdrop-blur rounded-2xl shadow border border-white/20 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-600" /> Database Status
        </h2>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-3">
          <div className="flex items-center gap-3">
            {dbStatus === 'connected' ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-red-500" />}
            <div>
              <p className="font-medium text-slate-900">Neon PostgreSQL</p>
              <p className="text-sm text-slate-500 font-mono text-xs">ep-still-bird-a4it1gqw-pooler.us-east-1.aws.neon.tech</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${dbStatus === 'connected' ? 'bg-green-500 animate-pulse' : dbStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className={`text-sm font-semibold capitalize ${dbStatus === 'connected' ? 'text-green-600' : dbStatus === 'disconnected' ? 'text-red-600' : 'text-yellow-600'}`}>
              {dbStatus}
            </span>
          </div>
        </div>
        <button onClick={checkDb} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-sm font-medium">
          Test Connection
        </button>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white/80 backdrop-blur rounded-2xl shadow border border-white/20 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-600" /> Notification Preferences
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Birthday Reminders', desc: 'Get notified on customer birthdays' },
            { label: 'Renewal Alerts', desc: 'Policy renewal reminders 30 days before' },
            { label: 'Claim Updates', desc: 'Notifications when claim status changes' },
            { label: 'New Approvals', desc: 'Alert when employee submits a customer' },
            { label: 'Payment Due', desc: 'Premium payment overdue alerts' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
              <button className="relative w-10 h-5 bg-blue-600 rounded-full">
                <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* System Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white/80 backdrop-blur rounded-2xl shadow border border-white/20 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">System Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {[
            ['App Name', appSettings.app_name],
            ['Version', 'v2.0.0'],
            ['Build', 'Production'],
            ['Database', 'Neon PostgreSQL 15'],
            ['Framework', 'React 18 + Vite 5'],
            ['Logged In As', `${tenant?.name} (${tenant?.role})`],
            ['IRDAI License', appSettings.irdai_license || 'Not set'],
            ['WhatsApp', appSettings.whatsapp_number || 'Not set'],
          ].map(([k, v]) => (
            <div key={k} className="p-3 bg-slate-50 rounded-xl">
              <p className="text-slate-500 text-xs mb-1">{k}</p>
              <p className="font-semibold text-slate-900 text-sm truncate">{v}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
