import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import Icon from '../components/Icon';

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

function StarRating({ rating, count }) {
  const filled = Math.round(rating || 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4,5].map((s) => (
          <Icon
            key={s}
            name="star"
            size={13}
            style={{
              color: s <= filled ? '#f59e0b' : 'var(--line-strong)',
              fill: s <= filled ? '#f59e0b' : 'none',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
        {rating ? Number(rating).toFixed(1) : '—'}
      </span>
      {count > 0 && (
        <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>({count} ulasan)</span>
      )}
    </div>
  );
}

function StatusChip({ isAvailable, isBusy }) {
  if (!isAvailable) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 700, padding: '3px 10px',
      borderRadius: 'var(--r-pill)',
      background: 'var(--surface-2)', color: 'var(--ink-mute)',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-mute)' }} />
      Inactive
    </span>
  );
  if (isBusy) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 700, padding: '3px 10px',
      borderRadius: 'var(--r-pill)',
      background: '#fff7ed', color: '#c2410c',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316' }} />
      Sedang Bertugas
    </span>
  );
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 700, padding: '3px 10px',
      borderRadius: 'var(--r-pill)',
      background: 'var(--ok-soft)', color: 'var(--ok)',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ok)' }} />
      Available
    </span>
  );
}

function AvailabilityToggle({ isAvailable, onToggle, loading }) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px',
        border: 'none', borderRadius: 'var(--r-pill)',
        background: isAvailable ? 'var(--ok-soft)' : 'var(--surface-2)',
        color: isAvailable ? 'var(--ok)' : 'var(--ink-mute)',
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        fontWeight: 700, fontSize: 13,
        transition: 'all .15s',
        opacity: loading ? .6 : 1,
      }}
    >
      <div style={{
        width: 32, height: 18, borderRadius: 9,
        background: isAvailable ? 'var(--ok)' : 'var(--line-strong)',
        position: 'relative', transition: 'background .2s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: 2, left: isAvailable ? 16 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff',
          transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      {isAvailable ? 'Available' : 'Inactive'}
    </button>
  );
}

function StatusPill({ status }) {
  const MAP = {
    pending_payment:  { cls: 'mk-pill mk-pill-warn', label: 'Menunggu Pembayaran' },
    finding_agent:    { cls: 'mk-pill mk-pill-info', label: 'Mencari Surveyor' },
    assigned:         { cls: 'mk-pill mk-pill-info', label: 'Sedang Disurvei' },
    result_submitted: { cls: 'mk-pill mk-pill-warn', label: 'Hasil Survei Siap' },
    completed:        { cls: 'mk-pill mk-pill-ok',   label: 'Selesai' },
    refunded:         { cls: 'mk-pill',              label: 'Dana Dikembalikan' },
    cancelled:        { cls: 'mk-pill mk-pill-err',  label: 'Dibatalkan' },
  };
  const cfg = MAP[status] || { cls: 'mk-pill', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

const fmtDatetime = (d) => d
  ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  : '—';

function JobCard({ order, onAccept, accepting, onView, isMyOrder, isBusy }) {
  return (
    <article className="mk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="mk-row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Location breadcrumb */}
          <div className="mk-row" style={{ gap: 6, color: 'var(--ink-mute)', fontSize: 12, marginBottom: 5 }}>
            <Icon name="map-pin" size={13} />
            {[order.kecamatan, order.kota].filter(Boolean).join(', ')}
          </div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
            margin: 0, letterSpacing: '-.01em', lineHeight: 1.3,
          }}>
            {order.kost_name}
          </h3>
          {/* Full address */}
          {order.address && (
            <div className="mk-row" style={{ gap: 5, marginTop: 4, fontSize: 12, color: 'var(--ink-soft)' }}>
              <Icon name="home" size={12} style={{ flexShrink: 0, color: 'var(--ink-mute)' }} />
              <span style={{ wordBreak: 'break-word' }}>{order.address}</span>
            </div>
          )}
          {/* Client name only — no phone on card */}
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
            Klien: <strong style={{ color: 'var(--ink)' }}>{order.user_name}</strong>
          </div>
          {/* Notes */}
          {order.notes && (
            <div style={{
              marginTop: 8, padding: '8px 11px',
              background: 'var(--surface-2)', borderRadius: 'var(--r-sm)',
              fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45, fontStyle: 'italic',
              wordBreak: 'break-word', overflowWrap: 'anywhere',
            }}>
              "{order.notes}"
            </div>
          )}
          {/* Deadline / created timestamp */}
          <div className="mk-row" style={{ gap: 5, marginTop: 6, fontSize: 12, color: 'var(--ink-mute)' }}>
            <Icon name="clock" size={12} />
            Masuk: {fmtDatetime(order.created_at)}
          </div>
          {isMyOrder && order.status === 'assigned' && (
            <div className="mk-row" style={{ gap: 6, marginTop: 6, fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
              <Icon name="camera" size={13} />
              Perlu kirim hasil survei
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <StatusPill status={order.status} />
          {!isMyOrder && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Komisi</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand)' }}>
                {rp(order.price)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mk-row" style={{ gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        {!isMyOrder ? (
          /* Available order: locked detail preview + accept action */
          <>
            <button className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => alert('Terima order terlebih dahulu untuk mengakses detail.')}>
              Detail
            </button>
            <button
              className="mk-btn mk-btn-primary mk-btn-sm"
              onClick={() => !isBusy && onAccept(order.id)}
              disabled={accepting === order.id || isBusy}
              title={isBusy ? 'Selesaikan order aktif dulu sebelum menerima order baru' : ''}
              style={isBusy ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <Icon name="check" size={14} />
              {accepting === order.id ? 'Menerima...' : isBusy ? 'Sedang Bertugas' : 'Terima'}
            </button>
          </>
        ) : order.status === 'assigned' ? (
          /* Active survey: detail + submit result */
          <>
            <button className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => onView(order.id)}>Detail</button>
            <button className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => onView(order.id)}>
              <Icon name="upload" size={14} /> Kirim Hasil
            </button>
          </>
        ) : (
          /* History / waiting for user — single action */
          <button className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => onView(order.id)}>
            Lihat Detail
          </button>
        )}
      </div>
    </article>
  );
}

// Statuses that belong in the history section (agent's work is fully done)
const AGENT_HISTORY_STATUS = ['result_submitted', 'completed', 'refunded', 'cancelled'];

function HistoryDivider({ count, expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mk-row"
      style={{
        gap: 10, alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', marginTop: 4, marginBottom: 4,
        background: 'var(--surface-2)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)', cursor: 'pointer', width: '100%',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span className="mk-row" style={{ gap: 8, color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600 }}>
        <Icon name="archive" size={14} />
        Riwayat ({count})
      </span>
      <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} style={{ color: 'var(--ink-mute)' }} />
    </button>
  );
}

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user, fetchMe } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const _urlTab = searchParams.get('tab');
  const tab = _urlTab === 'my' ? 'my-orders' : _urlTab === 'earn' ? 'commissions' : 'available';
  const setTab = (t) => {
    if (t === 'available') setSearchParams({}, { replace: true });
    else if (t === 'my-orders') setSearchParams({ tab: 'my' }, { replace: true });
    else if (t === 'commissions') setSearchParams({ tab: 'earn' }, { replace: true });
  };
  const [available, setAvailable] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [commissionRate, setCommissionRate] = useState(0.10);
  const [noKota, setNoKota] = useState(false);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [availToggleLoading, setAvailToggleLoading] = useState(false);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [a, m, c] = await Promise.all([
        api.get('/api/survey-orders/available'),
        api.get('/api/survey-orders/my-orders'),
        api.get('/api/survey-orders/agent/commissions').catch(() => ({ data: { list: [] } })),
      ]);
      setAvailable(a.data.orders);
      setNoKota(a.data.noKota || false);
      setOffline(a.data.offline || false);
      setMyOrders(m.data.orders);
      setCommissions(c.data.list || []);
      setCommissionRate(c.data.commission_rate ?? 0.10);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user?.id) return;
    api.get(`/api/reviews?reviewee_id=${user.id}`)
      .then(({ data }) => setRatingSummary(data.summary))
      .catch(() => {});
  }, [user?.id]);

  const toggleAvailability = async () => {
    if (!user) return;
    const newVal = !user.is_available;
    setAvailToggleLoading(true);
    try {
      await api.put('/api/users/availability', { is_available: newVal });
      await fetchMe();
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah status');
    } finally {
      setAvailToggleLoading(false);
    }
  };

  const acceptOrder = async (orderId) => {
    setAccepting(orderId);
    try {
      await api.post(`/api/survey-orders/${orderId}/accept`);
      await fetchData();
      setTab('my-orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menerima order');
    } finally {
      setAccepting(null);
    }
  };

  const activeOrders = myOrders.filter((o) => !AGENT_HISTORY_STATUS.includes(o.status));
  const activeCount  = myOrders.filter((o) => o.status === 'assigned').length;
  const doneCount    = myOrders.filter((o) => o.status === 'completed').length;
  const totalComm    = commissions.reduce((s, c) => s + (c.amount || 0), 0);
  const isAvailable  = user?.is_available !== false;
  const isBusy       = isAvailable && activeCount > 0;

  if (loading) return <div className="mk-loading"><div className="mk-spinner" /></div>;

  return (
    <div className="mk-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-mute)', fontWeight: 500 }}>
            Surveyor{user?.kota ? ` · ${user.kota}` : ''}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: '4px 0 0', letterSpacing: '-.02em' }}>
            Hi, {user?.name?.split(' ')[0] || 'Surveyor'}
          </h1>
          {ratingSummary && ratingSummary.count > 0 && (
            <div style={{ marginTop: 6 }}>
              <StarRating rating={ratingSummary.average} count={ratingSummary.count} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <AvailabilityToggle
            isAvailable={isAvailable}
            onToggle={toggleAvailability}
            loading={availToggleLoading}
          />
          <StatusChip isAvailable={isAvailable} isBusy={isBusy} />
        </div>
      </div>

      {/* Kota warning */}
      {noKota && (
        <div className="mk-alert mk-alert-warn" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="alert-circle" size={16} />
          <span>
            Kota belum diatur.{' '}
            <Link to="/profile" style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>
              Set kota di Profil
            </Link>{' '}
            agar bisa melihat dan menerima order survei.
          </span>
        </div>
      )}

      {/* Offline banner */}
      {offline && !noKota && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          background: 'var(--surface-2)', border: '1px solid var(--line-strong)',
          borderRadius: 'var(--r-md)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--line-strong)', color: 'var(--ink-mute)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Icon name="moon" size={17} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Status Inactive</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
              Anda tidak akan menerima order baru. Aktifkan <strong>Available</strong> untuk mulai menerima order.
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="mk-stat">
          <div className="mk-stat-label">Tersedia</div>
          <div className="mk-stat-value">{offline ? '—' : available.length}</div>
          <div className="mk-stat-sub">di {user?.kota || 'kotamu'}</div>
        </div>
        <div className="mk-stat">
          <div className="mk-stat-label">Aktif</div>
          <div className="mk-stat-value">{activeCount}</div>
          <div className="mk-stat-sub">perlu hasil survei</div>
        </div>
        <div className="mk-stat">
          <div className="mk-stat-label">Pendapatan bersih</div>
          <div className="mk-stat-value" style={{ color: 'var(--brand)' }}>{rp(totalComm)}</div>
          <div className="mk-stat-sub">setelah komisi {Math.round(commissionRate * 100)}%</div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="mk-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="mk-tabs">
            {[
              { id: 'available', label: `Tersedia (${offline ? '—' : available.length})` },
              { id: 'my-orders', label: `Pekerjaan Saya (${activeOrders.length})` },
              { id: 'commissions', label: 'Komisi' },
            ].map((t) => (
              <button
                key={t.id}
                className={`mk-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'available' && isAvailable && (
            <button className="mk-btn mk-btn-ghost mk-btn-sm">
              <Icon name="filter" size={14} /> Filter
            </button>
          )}
        </div>

        {/* Available orders */}
        {tab === 'available' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {offline ? (
              <div className="mk-empty">
                <div className="mk-empty-icon"><Icon name="moon" size={44} /></div>
                <div className="mk-empty-title">Status Inactive</div>
                <div className="mk-empty-sub">Aktifkan status Available di pojok kanan atas untuk melihat order.</div>
              </div>
            ) : !noKota && user?.kota ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                  Menampilkan order di area: <strong style={{ color: 'var(--ink)' }}>{user.kota}</strong>
                </p>
                {available.length === 0 ? (
                  <div className="mk-empty">
                    <div className="mk-empty-icon"><Icon name="search" size={44} /></div>
                    <div className="mk-empty-title">Tidak ada order tersedia</div>
                    <div className="mk-empty-sub">Cek kembali nanti atau update kota di profil Anda.</div>
                  </div>
                ) : (
                  available.map((order) => (
                    <JobCard
                      key={order.id}
                      order={order}
                      onAccept={acceptOrder}
                      accepting={accepting}
                      onView={(id) => navigate(`/survey-orders/${id}`)}
                      isMyOrder={false}
                      isBusy={isBusy}
                    />
                  ))
                )}
              </>
            ) : null}
          </div>
        )}

        {/* My orders — split active vs. history */}
        {tab === 'my-orders' && (() => {
          const activeOrders  = myOrders.filter((o) => !AGENT_HISTORY_STATUS.includes(o.status));
          const historyOrders = myOrders.filter((o) =>  AGENT_HISTORY_STATUS.includes(o.status));
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myOrders.length === 0 ? (
                <div className="mk-empty">
                  <div className="mk-empty-icon"><Icon name="clipboard" size={44} /></div>
                  <div className="mk-empty-title">Belum ada pekerjaan</div>
                  <div className="mk-empty-sub">Terima order dari tab "Tersedia" untuk mulai.</div>
                </div>
              ) : (
                <>
                  {activeOrders.length === 0 && historyOrders.length > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', padding: '12px 0' }}>
                      Tidak ada order aktif. Riwayat tersimpan di bawah.
                    </div>
                  )}
                  {activeOrders.map((order) => (
                    <JobCard
                      key={order.id}
                      order={order}
                      onAccept={acceptOrder}
                      accepting={accepting}
                      onView={(id) => navigate(`/survey-orders/${id}`)}
                      isMyOrder
                    />
                  ))}
                  {historyOrders.length > 0 && (
                    <>
                      <HistoryDivider
                        count={historyOrders.length}
                        expanded={showHistory}
                        onToggle={() => setShowHistory((v) => !v)}
                      />
                      {showHistory && historyOrders.map((order) => (
                        <div key={order.id} style={{ opacity: 0.72 }}>
                          <JobCard
                            order={order}
                            onAccept={acceptOrder}
                            accepting={accepting}
                            onView={(id) => navigate(`/survey-orders/${id}`)}
                            isMyOrder
                          />
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Commissions */}
        {tab === 'commissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="mk-card" style={{
              padding: 20, background: 'var(--brand)', border: 'none', color: '#fff',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: .85, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                Total Pendapatan Bersih
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-.02em' }}>
                {rp(totalComm)}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: .8 }}>
                Setelah komisi platform {Math.round(commissionRate * 100)}% per order
              </div>
              {ratingSummary && ratingSummary.count > 0 && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, opacity: .9 }}>
                  <Icon name="star" size={13} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {Number(ratingSummary.average).toFixed(1)} · {ratingSummary.count} ulasan
                  </span>
                </div>
              )}
            </div>

            {commissions.length === 0 ? (
              <div className="mk-empty">
                <div className="mk-empty-icon"><Icon name="wallet" size={44} /></div>
                <div className="mk-empty-title">Belum ada data komisi</div>
              </div>
            ) : (
              commissions.map((comm) => (
                <div key={comm.id} className="mk-card" style={{
                  padding: '14px 18px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Order #{String(comm.orderId || '').slice(0, 8)}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 2 }}>
                      {comm.date ? new Date(comm.date).toLocaleDateString('id-ID') : '—'}
                    </div>
                    {comm.gross_amount != null && (
                      <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 3 }}>
                        Bruto {rp(comm.gross_amount)} &minus; komisi {rp(comm.commission)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand)' }}>
                      +{rp(comm.amount)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ok)', marginTop: 2 }}>Masuk wallet</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
