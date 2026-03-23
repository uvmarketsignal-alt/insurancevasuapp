import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Database, Moon, Sun, Shield, Bell, Upload, Save, CheckCircle, Wifi, WifiOff,
  Phone, Mail, MapPin, Hash, ExternalLink,
} from 'lucide-react';
import { useStore } from '../store';
import { dbService } from '../lib/db-service';
import { whatsAppMeUrl } from '../lib/whatsapp';

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
  const [whatsappAutomationEnabled, setWhatsappAutomationEnabled] = useState(Boolean(appSettings.whatsapp_automation_enabled));
  const [whatsappBirthdayEnabled, setWhatsappBirthdayEnabled] = useState(Boolean(appSettings.whatsapp_birthday_enabled));
  const [whatsappRenewalEnabled, setWhatsappRenewalEnabled] = useState(Boolean(appSettings.whatsapp_renewal_enabled));
  const [whatsappBirthdayTemplate, setWhatsappBirthdayTemplate] = useState(appSettings.whatsapp_birthday_template || '');
  const [whatsappRenewalTemplate, setWhatsappRenewalTemplate] = useState(appSettings.whatsapp_renewal_template || '');
  const [saved, setSaved] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    checkDb();
  }, []);

  useEffect(() => {
    const base = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
    setWebhookUrl(`${base}/api/whatsapp-webhook`);
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
      whatsapp_automation_enabled: whatsappAutomationEnabled,
      whatsapp_birthday_enabled: whatsappBirthdayEnabled,
      whatsapp_renewal_enabled: whatsappRenewalEnabled,
      whatsapp_birthday_template: whatsappBirthdayTemplate,
      whatsapp_renewal_template: whatsappRenewalTemplate,
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

            {/* WhatsApp Automation */}
            <div className="md:col-span-2">
              <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">WhatsApp Automation</p>
                  <p className="text-sm text-slate-500 mt-1">
                    When enabled, the system will auto-send WhatsApp messages for birthday and renewal reminders.
                  </p>
                </div>
                <label className="flex items-center gap-2 select-none pt-1">
                  <input
                    type="checkbox"
                    checked={whatsappAutomationEnabled}
                    onChange={(e) => {
                      setWhatsappAutomationEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setWhatsappBirthdayEnabled(false);
                        setWhatsappRenewalEnabled(false);
                      }
                    }}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Enabled</span>
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                  <label className="flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={whatsappBirthdayEnabled}
                      onChange={(e) => setWhatsappBirthdayEnabled(e.target.checked)}
                      disabled={!whatsappAutomationEnabled}
                      className="rounded border-slate-300 disabled:opacity-50"
                    />
                    <span className="text-sm font-medium text-slate-700">Birthday messages</span>
                  </label>
                  <textarea
                    value={whatsappBirthdayTemplate}
                    onChange={(e) => setWhatsappBirthdayTemplate(e.target.value)}
                    disabled={!whatsappAutomationEnabled || !whatsappBirthdayEnabled}
                    className="mt-3 w-full min-h-[108px] px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-60"
                  />
                  <p className="text-xs text-slate-400 mt-2">Placeholders: <code className="font-mono">{"{{name}}"}</code></p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                  <label className="flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={whatsappRenewalEnabled}
                      onChange={(e) => setWhatsappRenewalEnabled(e.target.checked)}
                      disabled={!whatsappAutomationEnabled}
                      className="rounded border-slate-300 disabled:opacity-50"
                    />
                    <span className="text-sm font-medium text-slate-700">Renewal reminders</span>
                  </label>
                  <textarea
                    value={whatsappRenewalTemplate}
                    onChange={(e) => setWhatsappRenewalTemplate(e.target.value)}
                    disabled={!whatsappAutomationEnabled || !whatsappRenewalEnabled}
                    className="mt-3 w-full min-h-[108px] px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-60"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Placeholders: <code className="font-mono">{"{{name}}"}</code>, <code className="font-mono">{"{{policy_type}}"}</code>, <code className="font-mono">{"{{policy_number}}"}</code>, <code className="font-mono">{"{{days_left}}"}</code>
                  </p>
                </div>
              </div>
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

      {/* WhatsApp Cloud API (Meta) — owner */}
      {tenant?.role === 'owner' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur rounded-2xl shadow border border-white/20 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-600" /> WhatsApp Cloud API (Meta)
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Use the saved agency number for wa.me links. For automated messaging, configure Meta WhatsApp Cloud API and these server environment variables on Vercel:
            <code className="block mt-2 text-xs bg-slate-100 p-3 rounded-lg font-mono text-slate-800">
              WHATSAPP_VERIFY_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
            </code>
          </p>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs mb-1">Webhook callback URL (Meta dashboard)</p>
              <p className="font-mono text-xs break-all bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800">{webhookUrl || '…'}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={whatsAppMeUrl(whatsappNumber || appSettings.whatsapp_number || '')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
              >
                <ExternalLink className="w-4 h-4" />
                Open WhatsApp (saved number)
              </a>
              <span className="text-xs text-slate-400 self-center">
                Server route <code className="font-mono">POST /api/whatsapp-send</code> sends messages when tokens are set (Bearer <code className="font-mono">SYNC_SECRET</code>).
              </span>
            </div>
          </div>
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
