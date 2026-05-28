import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../store/authStore';
import api, { getFileUrl } from '../services/api';
import KotaSelect from '../components/KotaSelect';
import Icon from '../components/Icon';

const VEHICLE_OPTIONS = [
  { code: 'MOTORCYCLE', label: 'Motor',      desc: 'Barang ringan: kardus kecil, koper' },
  { code: 'VAN',        label: 'Van',        desc: 'Barang sedang: kasur lipat, perabot' },
  { code: 'PICKUP_BOX', label: 'Pickup Box', desc: 'Barang besar: lemari, spring bed' },
];

const TABS_MOVER = [
  { id: 'profile',  icon: 'user',    label: 'Informasi Pribadi' },
  { id: 'vehicle',  icon: 'truck',   label: 'Kendaraan & Dokumen' },
  { id: 'security', icon: 'shield',  label: 'Keamanan' },
];

const TABS = [
  { id: 'profile',  icon: 'user',    label: 'Informasi Pribadi' },
  { id: 'security', icon: 'shield',  label: 'Keamanan' },
];

function Section({ title, sub, children }) {
  return (
    <div className="mk-card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-.01em' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="mk-field" style={{ marginBottom: 16 }}>
      <label className="mk-label">{label}</label>
      {children}
      {hint && <div className="mk-help">{hint}</div>}
    </div>
  );
}

function StarRating({ rating, count }) {
  const filled = Math.round(rating || 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1,2,3,4,5].map((s) => (
          <Icon
            key={s}
            name="star"
            size={16}
            style={{
              color: s <= filled ? '#f59e0b' : 'var(--line-strong)',
              fill: s <= filled ? '#f59e0b' : 'none',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)' }}>
          {rating ? Number(rating).toFixed(1) : '—'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
          / 5 · {count} ulasan
        </span>
      </div>
    </div>
  );
}

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({ name: '', phone: '', location: '', kota: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [ratingSummary, setRatingSummary] = useState(null);

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarErr, setAvatarErr] = useState('');
  const [avatarMsg, setAvatarMsg] = useState('');
  const avatarInputRef = useRef(null);

  // Mover vehicle & docs state
  const [moverProfile, setMoverProfile] = useState(null);
  const [moverForm, setMoverForm] = useState({ vehicle_types: [], plate_number: '', service_area: '', bio: '' });
  const [moverMsg, setMoverMsg] = useState('');
  const [moverErr, setMoverErr] = useState('');
  const [savingMover, setSavingMover] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState({ stnk: false, sim: false });
  const stnkRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '', location: user.location || '', kota: user.kota || '' });
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const isProvider = user.role === 'agent' || user.role === 'mover';
    if (!isProvider) return;
    api.get(`/api/reviews?reviewee_id=${user.id}`)
      .then(({ data }) => setRatingSummary(data.summary))
      .catch(() => {});
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user?.role !== 'mover') return;
    api.get('/api/me/capabilities')
      .then(({ data }) => {
        const mp = data.mover_profile || {};
        setMoverProfile(mp);
        setMoverForm({
          vehicle_types: mp.vehicle_types || [],
          plate_number:  mp.plate_number  || '',
          service_area:  mp.service_area  || '',
          bio:           mp.bio           || '',
        });
      })
      .catch(() => {});
  }, [user?.role]);

  const toggleVehicle = (code) => {
    setMoverForm((f) => ({
      ...f,
      vehicle_types: f.vehicle_types.includes(code)
        ? f.vehicle_types.filter((x) => x !== code)
        : [...f.vehicle_types, code],
    }));
  };

  const saveMoverProfile = async (e) => {
    e.preventDefault();
    if (moverForm.vehicle_types.length === 0) return setMoverErr('Pilih minimal satu jenis kendaraan');
    setSavingMover(true); setMoverMsg(''); setMoverErr('');
    try {
      const { data } = await api.put('/api/me/capabilities/mover', moverForm);
      setMoverProfile(data.mover_profile);
      setMoverMsg('Profil kendaraan berhasil disimpan.');
    } catch (error) {
      setMoverErr(error.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSavingMover(false);
    }
  };

  const uploadDoc = async (field, file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setMoverErr('Hanya file gambar (JPG, PNG, WebP) yang diizinkan.');
      return;
    }
    setUploadingDoc((d) => ({ ...d, [field]: true }));
    setMoverErr('');
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await api.post(`/api/me/capabilities/mover/upload/${field}`, fd);
      setMoverProfile((p) => ({ ...p, [`${field}_url`]: data.url }));
      setMoverMsg(`Foto ${field.toUpperCase()} berhasil diunggah.`);
    } catch (error) {
      setMoverErr(error.response?.data?.error || `Gagal upload foto ${field.toUpperCase()}`);
    } finally {
      setUploadingDoc((d) => ({ ...d, [field]: false }));
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side security: validate both MIME type and extension
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
    if (!ALLOWED_AVATAR_TYPES.includes(file.type) || !allowedExts.includes(ext)) {
      setAvatarErr('Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarErr('Ukuran foto maksimal 5 MB');
      e.target.value = '';
      return;
    }

    setAvatarErr(''); setAvatarMsg(''); setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      await api.post('/api/users/avatar', fd);
      await fetchMe();
      setAvatarMsg('Foto profil berhasil diperbarui.');
    } catch (error) {
      setAvatarErr(error.response?.data?.error || 'Gagal mengunggah foto profil');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setErr('');
    try {
      await api.put('/api/users/profile', form);
      await fetchMe();
      setMsg('Profil berhasil diperbarui.');
    } catch (error) {
      setErr(error.response?.data?.error || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setChangingPw(true); setPwMsg(''); setPwErr('');
    try {
      await api.post('/api/users/change-password', pwForm);
      setPwMsg('Password berhasil diubah.');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      setPwErr(error.response?.data?.error || 'Gagal mengubah password');
    } finally {
      setChangingPw(false);
    }
  };

  if (!user) return <div className="mk-loading"><div className="mk-spinner" /></div>;

  const roleLabel = { customer: 'Penyewa', agent: 'Surveyor', mover: 'Mover' }[user.role] || user.role;
  const joined = new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const isProvider = user.role === 'agent' || user.role === 'mover';
  const tabs = user.role === 'mover' ? TABS_MOVER : TABS;

  return (
    <div className="mk-page">
      <div>
        <div style={{ fontSize: 13, color: 'var(--ink-mute)', fontWeight: 500 }}>Akun</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-.02em' }}>
          Profil Saya
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div className="mk-card" style={{ padding: '8px 6px' }}>
            {/* Avatar + name */}
            <div style={{ padding: '12px 10px 14px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
              {/* Avatar with change button overlay */}
              <div style={{ position: 'relative', width: 56, height: 56, marginBottom: 8 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  display: 'grid', placeItems: 'center', overflow: 'hidden',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
                  border: '2px solid var(--line)',
                }}>
                  {user.avatar_url ? (
                    <img
                      src={getFileUrl(user.avatar_url)}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    user.name?.[0] || 'U'
                  )}
                </div>
                {/* Overlay change button */}
                <button
                  type="button"
                  title="Ganti foto profil"
                  disabled={avatarUploading}
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--brand)', color: '#fff',
                    border: '2px solid var(--surface)',
                    display: 'grid', placeItems: 'center',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  {avatarUploading
                    ? <div className="mk-spinner" style={{ width: 10, height: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                    : <Icon name="camera" size={10} />
                  }
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{user.name}</div>
              <span className="mk-pill mk-pill-info" style={{ marginTop: 5, fontSize: 11 }}>
                {roleLabel}
              </span>
              {avatarMsg && (
                <div style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600, marginTop: 4 }}>✓ {avatarMsg}</div>
              )}
              {avatarErr && (
                <div style={{ fontSize: 11, color: 'var(--err)', fontWeight: 600, marginTop: 4 }}>⚠️ {avatarErr}</div>
              )}

              {/* Rating for agents/movers */}
              {isProvider && ratingSummary && ratingSummary.count > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                    Rating
                  </div>
                  <StarRating rating={ratingSummary.average} count={ratingSummary.count} />
                </div>
              )}
              {isProvider && ratingSummary && ratingSummary.count === 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-mute)' }}>
                  Belum ada ulasan
                </div>
              )}
            </div>

            {/* Tab buttons */}
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '9px 10px',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: activeTab === t.id ? 'var(--brand-soft)' : 'transparent',
                  color: activeTab === t.id ? 'var(--brand-ink)' : 'var(--ink-soft)',
                  fontFamily: 'var(--font-body)',
                  transition: 'background .1s, color .1s',
                }}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Account info */}
          <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              Info Akun
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', wordBreak: 'break-all', lineHeight: 1.4 }}>{user.email}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 4 }}>Bergabung {joined}</div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {activeTab === 'profile' && (
            <>
              {/* Rating card for providers */}
              {isProvider && ratingSummary && ratingSummary.count > 0 && (
                <div className="mk-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                        Rating & Ulasan
                      </div>
                      <StarRating rating={ratingSummary.average} count={ratingSummary.count} />
                    </div>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: 'var(--brand-soft)', color: 'var(--brand)',
                      display: 'grid', placeItems: 'center',
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>
                          {Number(ratingSummary.average).toFixed(1)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink-mute)', marginTop: 1 }}>/ 5.0</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Foto Profil card ── */}
              <Section title="Foto Profil" sub="Ditampilkan kepada pengguna dan mitra lainnya.">
                {avatarMsg && <div className="mk-alert mk-alert-ok" style={{ marginBottom: 16 }}>{avatarMsg}</div>}
                {avatarErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 16 }}>{avatarErr}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  {/* Current avatar preview */}
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    display: 'grid', placeItems: 'center', overflow: 'hidden',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28,
                    border: '2px solid var(--line)', flexShrink: 0,
                  }}>
                    {user.avatar_url ? (
                      <img
                        src={getFileUrl(user.avatar_url)}
                        alt="Foto profil"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      user.name?.[0] || 'U'
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      className="mk-btn mk-btn-primary"
                      style={{ fontSize: 13, marginBottom: 6 }}
                      disabled={avatarUploading}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {avatarUploading
                        ? <><div className="mk-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Mengunggah...</>
                        : <><Icon name="camera" size={14} /> {user.avatar_url ? 'Ganti Foto Profil' : 'Upload Foto Profil'}</>
                      }
                    </button>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>JPG, PNG, atau WebP · Maks. 5 MB</div>
                  </div>
                </div>
              </Section>

              <Section title="Informasi Pribadi" sub="Nama dan kontak yang ditampilkan ke mitra.">
                {msg && <div className="mk-alert mk-alert-ok" style={{ marginBottom: 16 }}>{msg}</div>}
                {err && <div className="mk-alert mk-alert-err" style={{ marginBottom: 16 }}>{err}</div>}
                <form onSubmit={saveProfile}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field label="Nama Lengkap">
                      <input
                        className="mk-input"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </Field>
                    <Field label="Nomor HP">
                      <input
                        className="mk-input"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="08xxxxxxxxxx"
                      />
                    </Field>
                  </div>
                  <Field label="Alamat / Lokasi" hint="Digunakan untuk estimasi jarak.">
                    <input
                      className="mk-input"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Contoh: Jakarta Selatan"
                    />
                  </Field>
                  {user.role === 'agent' && (
                    <Field label="Kota Operasional" hint="Order survei dari kota ini akan dikirim ke Anda.">
                      <KotaSelect value={form.kota} onChange={(kota) => setForm({ ...form, kota })} placeholder="Pilih kota..." />
                    </Field>
                  )}
                  <button className="mk-btn mk-btn-primary" type="submit" disabled={saving} style={{ marginTop: 4 }}>
                    {saving ? 'Menyimpan...' : (
                      <><Icon name="check" size={15} /> Simpan Perubahan</>
                    )}
                  </button>
                </form>
              </Section>
            </>
          )}

          {activeTab === 'vehicle' && (
            <Section title="Kendaraan & Dokumen" sub="Informasi ini wajib diisi agar bisa menerima orderan.">
              {moverMsg && <div className="mk-alert mk-alert-ok" style={{ marginBottom: 16 }}>{moverMsg}</div>}
              {moverErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 16 }}>{moverErr}</div>}
              <form onSubmit={saveMoverProfile}>
                <Field label="Jenis Kendaraan" hint="Pilih minimal satu. Order akan difilter sesuai kendaraan Anda.">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {VEHICLE_OPTIONS.map((v) => {
                      const sel = moverForm.vehicle_types.includes(v.code);
                      return (
                        <label
                          key={v.code}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px',
                            border: `1.5px solid ${sel ? 'var(--brand)' : 'var(--line-strong)'}`,
                            borderRadius: 'var(--r-sm)',
                            background: sel ? 'var(--brand-soft)' : 'var(--surface)',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleVehicle(v.code)}
                            style={{ accentColor: 'var(--brand)', width: 16, height: 16 }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{v.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{v.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Nomor Plat Kendaraan" hint="Contoh: B 1234 ABC">
                  <input
                    className="mk-input"
                    value={moverForm.plate_number}
                    onChange={(e) => setMoverForm({ ...moverForm, plate_number: e.target.value })}
                    placeholder="B 1234 ABC"
                    maxLength={20}
                  />
                </Field>

                <Field label="Area Layanan" hint="Kota / wilayah utama tempat Anda beroperasi.">
                  <input
                    className="mk-input"
                    value={moverForm.service_area}
                    onChange={(e) => setMoverForm({ ...moverForm, service_area: e.target.value })}
                    placeholder="Contoh: Jakarta Selatan, Tangerang, Bekasi"
                    maxLength={200}
                  />
                </Field>

                <button className="mk-btn mk-btn-primary" type="submit" disabled={savingMover} style={{ marginBottom: 24 }}>
                  {savingMover ? 'Menyimpan...' : <><Icon name="check" size={15} /> Simpan Profil Kendaraan</>}
                </button>
              </form>

              {/* STNK Upload */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Foto STNK</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 12 }}>
                  Wajib diisi. Max 1 foto (JPG, PNG, WebP, maks 5MB).
                </div>
                {moverProfile?.stnk_url && (
                  <img
                    src={getFileUrl(moverProfile.stnk_url)}
                    alt="STNK"
                    style={{ height: 120, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', marginBottom: 10, display: 'block' }}
                  />
                )}
                <input
                  ref={stnkRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => uploadDoc('stnk', e.target.files[0])}
                />
                <button
                  className="mk-btn"
                  type="button"
                  disabled={uploadingDoc.stnk}
                  onClick={() => stnkRef.current?.click()}
                  style={{ fontSize: 13 }}
                >
                  {uploadingDoc.stnk ? 'Mengunggah...' : (moverProfile?.stnk_url ? 'Ganti Foto STNK' : 'Upload Foto STNK')}
                </button>
              </div>

              {/* SIM Upload */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Foto SIM</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 12 }}>
                  Wajib diisi. Max 1 foto (JPG, PNG, WebP, maks 5MB).
                </div>
                {moverProfile?.sim_url && (
                  <img
                    src={getFileUrl(moverProfile.sim_url)}
                    alt="SIM"
                    style={{ height: 120, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', marginBottom: 10, display: 'block' }}
                  />
                )}
                <input
                  ref={simRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => uploadDoc('sim', e.target.files[0])}
                />
                <button
                  className="mk-btn"
                  type="button"
                  disabled={uploadingDoc.sim}
                  onClick={() => simRef.current?.click()}
                  style={{ fontSize: 13 }}
                >
                  {uploadingDoc.sim ? 'Mengunggah...' : (moverProfile?.sim_url ? 'Ganti Foto SIM' : 'Upload Foto SIM')}
                </button>
              </div>
            </Section>
          )}

          {activeTab === 'security' && (
            <Section title="Ubah Password" sub="Gunakan password yang kuat dan unik.">
              {pwMsg && <div className="mk-alert mk-alert-ok" style={{ marginBottom: 16 }}>{pwMsg}</div>}
              {pwErr && <div className="mk-alert mk-alert-err" style={{ marginBottom: 16 }}>{pwErr}</div>}
              <form onSubmit={changePassword} style={{ maxWidth: 400 }}>
                <Field label="Password Saat Ini">
                  <input
                    className="mk-input"
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <Field label="Password Baru" hint="Minimal 6 karakter.">
                  <input
                    className="mk-input"
                    type="password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </Field>
                <button className="mk-btn mk-btn-primary" type="submit" disabled={changingPw} style={{ marginTop: 4 }}>
                  {changingPw ? 'Mengubah...' : (
                    <><Icon name="key" size={15} /> Ubah Password</>
                  )}
                </button>
              </form>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
