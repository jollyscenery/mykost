import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Icon from '../components/Icon';
import useAuthStore from '../store/authStore';

const ROLES = [
  {
    id: 'surveyor',
    icon: 'clipboard',
    title: 'Agent / Surveyor',
    desc: 'Bantu calon penghuni mengecek kost secara langsung. Fleksibel, dibayar per kunjungan.',
    color: 'var(--brand)',
  },
  {
    id: 'mover',
    icon: 'truck',
    title: 'Mover / Jasa Angkut',
    desc: 'Jalankan layanan pindahan. Atur kendaraan, terima order, bangun reputasi di MyKost.',
    color: '#7c3aed',
  },
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB

export default function MitraRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('role') || '';

  const [step, setStep] = useState(preselected ? 2 : 1);
  const [role, setRole] = useState(preselected || '');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [validErr, setValidErr] = useState('');
  const [apiErr, setApiErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { fetchMe } = useAuthStore();

  // Profile photo state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoErr, setPhotoErr] = useState('');
  const photoInputRef = useRef(null);

  const set = (k, v) => { setApiErr(''); setValidErr(''); setForm((f) => ({ ...f, [k]: v })); };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side security: validate MIME type by checking both extension and browser-reported type
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || !allowedExts.includes(ext)) {
      setPhotoErr('Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan');
      e.target.value = '';
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoErr('Ukuran foto maksimal 5 MB');
      e.target.value = '';
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    setPhotoErr('');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleStep1 = () => {
    if (!role) return setValidErr('Pilih salah satu peran terlebih dahulu');
    setValidErr('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2)       return setValidErr('Nama minimal 2 karakter');
    if (form.password.length < 6)          return setValidErr('Password minimal 6 karakter');
    const ph = form.phone;
    if (ph.length < 10 || ph.length > 13)  return setValidErr('Nomor HP harus 10–13 digit');
    if (!photoFile)                         return setValidErr('Foto profil wajib diunggah');

    setLoading(true); setApiErr(''); setValidErr('');
    try {
      // Step 1: Register the account
      const { data } = await api.post('/api/auth/register-mitra', {
        ...form,
        account_type: role,
      });
      localStorage.setItem('token', data.token);

      // Step 2: Upload profile photo (token is now set in localStorage, interceptor will attach it)
      const fd = new FormData();
      fd.append('photo', photoFile);
      await api.post('/api/users/avatar', fd);

      await fetchMe();
      navigate('/dashboard');
    } catch (err) {
      setApiErr(err.response?.data?.error || 'Pendaftaran gagal, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find((r) => r.id === role);

  return (
    <div className="auth-shell">
      <aside className="auth-shell-hero">
        <div>
          <img src="/logo.png" alt="MyKost" style={{ height: 72, width: 'auto' }} />
        </div>
        <div>
          <h1>Bergabung sebagai Mitra MyKost.</h1>
          <p>
            Jadikan keahlian Anda sebagai sumber penghasilan. Daftar sebagai surveyor
            atau mover dan mulai terima order hari ini.
          </p>
          <div className="hero-features">
            {[
              'Pembayaran langsung masuk ke saldo digital',
              'Order masuk otomatis sesuai kota & kendaraan',
              'Tidak ada biaya pendaftaran',
            ].map((t) => (
              <div key={t} className="hero-feature">
                <span className="hero-feature-bullet">✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-foot">Sudah dipercaya ribuan mitra di seluruh Indonesia.</div>
      </aside>

      <main className="auth-shell-form">
        <div className="auth-card">
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            {[1, 2].map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: step >= s ? 'var(--brand)' : 'var(--surface-2)',
                  color: step >= s ? '#fff' : 'var(--ink-mute)',
                  display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
                }}>
                  {step > s ? '✓' : s}
                </div>
                <span style={{ fontSize: 12, color: step >= s ? 'var(--ink)' : 'var(--ink-mute)', fontWeight: step >= s ? 600 : 400 }}>
                  {s === 1 ? 'Pilih peran' : 'Data akun'}
                </span>
                {s < 2 && <div style={{ width: 20, height: 1, background: 'var(--line-strong)', margin: '0 2px' }} />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Choose role ── */}
          {step === 1 && (
            <>
              <div className="auth-card-title">Saya ingin menjadi…</div>
              <div className="auth-card-sub" style={{ marginBottom: 20 }}>
                Pilih peran yang sesuai. Tidak bisa diubah setelah mendaftar.
              </div>

              {validErr && <div className="alert alert-error" style={{ marginBottom: 14 }}>{validErr}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {ROLES.map((r) => {
                  const sel = role === r.id;
                  return (
                    <button
                      key={r.id} type="button"
                      onClick={() => { setValidErr(''); setRole(r.id); }}
                      style={{
                        border: `2px solid ${sel ? r.color : 'var(--line-strong)'}`,
                        borderRadius: 'var(--r-md)',
                        background: sel ? `${r.color}14` : 'var(--surface)',
                        padding: '16px 18px', textAlign: 'left', cursor: 'pointer',
                        display: 'flex', gap: 14, alignItems: 'flex-start',
                        transition: 'all .12s',
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 'var(--r-sm)',
                        background: sel ? r.color : 'var(--surface-2)',
                        color: sel ? '#fff' : 'var(--ink-mute)',
                        display: 'grid', placeItems: 'center', flexShrink: 0,
                      }}>
                        <Icon name={r.icon} size={20} stroke={1.75} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: sel ? r.color : 'var(--ink)', marginBottom: 4 }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{r.desc}</div>
                      </div>
                      {sel && <Icon name="check-circle" size={20} style={{ color: r.color, flexShrink: 0, marginTop: 2 }} />}
                    </button>
                  );
                })}
              </div>

              <button className="btn-modern is-brand" type="button" onClick={handleStep1}>
                Lanjutkan →
              </button>

              <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                Ingin jadi pengguna biasa?{' '}
                <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 600 }}>Daftar sebagai Pengguna</Link>
              </p>
            </>
          )}

          {/* ── Step 2: Account details ── */}
          {step === 2 && (
            <>
              <div className="auth-card-title">
                Buat akun {selectedRole?.title}
              </div>
              <div className="auth-card-sub" style={{ marginBottom: 20 }}>
                Isi data diri Anda untuk menyelesaikan pendaftaran.
              </div>

              {(apiErr || validErr) && <div className="alert alert-error">{validErr || apiErr}</div>}

              <form onSubmit={handleSubmit}>
                {/* ── Foto Profil (wajib) ── */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="label-modern">
                    Foto Profil <span style={{ color: 'var(--err)', fontWeight: 700 }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
                    {/* Avatar preview */}
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      style={{
                        width: 72, height: 72, borderRadius: '50%',
                        border: `2px dashed ${photoErr ? 'var(--err)' : photoFile ? 'var(--brand)' : 'var(--line-strong)'}`,
                        background: 'var(--surface-2)',
                        display: 'grid', placeItems: 'center',
                        cursor: 'pointer', flexShrink: 0, overflow: 'hidden',
                        transition: 'border-color .15s',
                      }}
                    >
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Icon name="camera" size={24} style={{ color: 'var(--ink-mute)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <button
                        type="button"
                        className="btn-modern"
                        style={{ fontSize: 13, padding: '6px 14px', width: 'auto', marginBottom: 4 }}
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <Icon name="upload" size={13} /> {photoFile ? 'Ganti Foto' : 'Pilih Foto'}
                      </button>
                      {photoErr
                        ? <div style={{ fontSize: 12, color: 'var(--err)', fontWeight: 600, marginTop: 2 }}>⚠️ {photoErr}</div>
                        : photoFile
                          ? <div style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600, marginTop: 2 }}>✓ {photoFile.name}</div>
                          : <div className="help-modern" style={{ marginTop: 2 }}>JPG, PNG, atau WebP · Maks. 5 MB</div>
                      }
                    </div>
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="label-modern">Nama Lengkap</label>
                  <input className="input-modern" type="text" placeholder="Contoh: Budi Santoso"
                    value={form.name} maxLength={60}
                    onChange={(e) => set('name', e.target.value)}
                    autoComplete="name" required />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="label-modern">Email</label>
                  <input className="input-modern" type="email" placeholder="nama@email.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    autoComplete="email" required />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="label-modern">Nomor HP</label>
                  <input className="input-modern" type="tel" placeholder="08xxxxxxxxxx"
                    value={form.phone} maxLength={13}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set('phone', v); }}
                    autoComplete="tel" required />
                  <div className="help-modern">10–13 digit</div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label-modern">Password</label>
                  <input className="input-modern" type="password" placeholder="Minimal 6 karakter"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    autoComplete="new-password" minLength={6} required />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn-modern"
                    style={{ background: 'var(--surface-2)', color: 'var(--ink)', width: 'auto', flex: '0 0 auto', padding: '0 18px', whiteSpace: 'nowrap' }}
                    type="button" onClick={() => preselected ? navigate('/dashboard') : setStep(1)}
                  >
                    ← Kembali
                  </button>
                  <button className="btn-modern is-brand" type="submit" disabled={loading} style={{ flex: 1, width: 'auto', whiteSpace: 'nowrap' }}>
                    {loading ? 'Membuat akun...' : 'Daftar & Lanjutkan'}
                  </button>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--ink-mute)', textAlign: 'center', marginTop: '1rem' }}>
                  Dengan mendaftar, Anda menyetujui Syarat & Ketentuan serta Kebijakan Privasi MyKost.
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
