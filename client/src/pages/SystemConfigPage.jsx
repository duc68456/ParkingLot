import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import '../styles/pages/SystemConfigPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useAuthz } from '../contexts/AuthzContext';

import carIcon from '../assets/icons/vehicles.svg?react';
import motorcycleIcon from '../assets/icons/entry-sessions.svg?react';
import truckIcon from '../assets/icons/purchase-card.svg?react';
import vanIcon from '../assets/icons/cards.svg?react';
import { getApiBaseUrl } from '../utils/apiBase'

const API_BASE_URL = getApiBaseUrl()

function SectionHeader({ icon: Icon, iconBg = '#DBEAFE', title, subtitle }) {
  return (
    <div className="syscfg__sectionHeader">
      <div className="syscfg__sectionIcon" style={{ background: iconBg }}>
        <Icon className="syscfg__sectionIconSvg" aria-hidden="true" />
      </div>
      <div className="syscfg__sectionText">
        <div className="syscfg__sectionTitle">{title}</div>
        <div className="syscfg__sectionSubtitle">{subtitle}</div>
      </div>
    </div>
  );
}

function CapacityCard({
  label,
  accent = '#1447E6',
  bg = '#EFF6FF',
  border = '#BEDBFF',
  icon: Icon,
  value,
  onChange,
  disabled = false,
}) {
  return (
    <div className="syscfg__capCard" style={{ background: bg, borderColor: border }}>
      <div className="syscfg__capCardTop">
        <div className="syscfg__capIconWrap">
          <Icon className="syscfg__capIcon" aria-hidden="true" />
        </div>
        <div className="syscfg__capMeta">
          <div className="syscfg__capLabel" style={{ color: accent }}>
            {label}
          </div>
          <div className="syscfg__capHint">Maximum capacity</div>
        </div>
      </div>

      <input
        className="syscfg__numberInput"
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        inputMode="numeric"
        disabled={disabled}
      />
    </div>
  );
}

const STYLE_PRESETS = [
  { accent: '#1447E6', bg: '#EFF6FF', border: '#BEDBFF', icon: carIcon },
  { accent: '#8200DB', bg: '#FAF5FF', border: '#E9D4FF', icon: motorcycleIcon },
  { accent: '#CA3500', bg: '#FFF7ED', border: '#FFD6A7', icon: truckIcon },
  { accent: '#008236', bg: '#F0FDF4', border: '#B9F8CF', icon: vanIcon },
];

function pickPreset(name, index) {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('motor') || lower.includes('xe máy') || lower.includes('bike')) return STYLE_PRESETS[1];
  if (lower.includes('truck') || lower.includes('xe tải')) return STYLE_PRESETS[2];
  if (lower.includes('van') || lower.includes('bus') || lower.includes('xe khách')) return STYLE_PRESETS[3];
  return STYLE_PRESETS[index % STYLE_PRESETS.length];
}

export default function SystemConfigPage() {
  const { authHeaders } = useAuth();
  const { hasPermission } = useAuthz();

  // Dynamic capacity list from backend (matches real VehicleTypes from DB)
  const [capacities, setCapacities] = useState([]);
  const totalCapacity = useMemo(
    () => (capacities || []).reduce((sum, c) => sum + (Number(c.total) || 0), 0),
    [capacities]
  );

  const [freeMinutes, setFreeMinutes] = useState(15);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canEdit = hasPermission('SYSTEM_CONFIG.FULL');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError('');
      setSuccess('');
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/system-config`, {
          headers: { ...authHeaders },
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = json?.error?.message || 'Failed to load system config';
          throw new Error(msg);
        }

        const cfg = json?.data?.config;
        const capList = Array.isArray(json?.data?.capacities) ? json.data.capacities : [];

        if (!cancelled) {
          setCapacities(
            capList.map((c) => ({
              id: String(c?.id || ''),
              name: String(c?.name || ''),
              total: Number(c?.total ?? 0)
            }))
          );
          setFreeMinutes(Number(cfg?.entrySession?.freeMinutes ?? 15));
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load system config');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Only load if we have an auth header; otherwise let the app route guards handle auth.
    if (authHeaders?.Authorization) load();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  const handleSave = async () => {
    if (!canEdit) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const byType = {};
      for (const c of capacities || []) {
        const id = String(c?.id || '').trim().toUpperCase();
        if (!id) continue;
        byType[id] = { total: Number(c?.total || 0) };
      }

      const payload = {
        parkingCapacityByType: byType,
        entrySession: { freeMinutes: freeMinutes || 0 },
      };

      const res = await fetch(`${API_BASE_URL}/api/system-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.error?.message || 'Failed to save configuration';
        throw new Error(msg);
      }

      setSuccess('Configuration saved');
    } catch (e) {
      setError(e?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="syscfg">
      <PageHeader
        title="System Configuration"
        subtitle="Configure parking lot capacity and system parameters"
      />

      {(loading || error || success) && (
        <div style={{ marginBottom: 12 }}>
          {loading && <div className="syscfg__banner">Loading configuration…</div>}
          {!loading && error && <div className="syscfg__banner syscfg__banner--error">{error}</div>}
          {!loading && success && <div className="syscfg__banner syscfg__banner--success">{success}</div>}
        </div>
      )}

      <div className="syscfg__card">
        <SectionHeader
          icon={carIcon}
          iconBg="#DBEAFE"
          title="Parking Lot Capacity"
          subtitle="Set the maximum capacity for each vehicle type"
        />

        <div className="syscfg__capGrid">
          {(capacities || []).map((c, index) => {
            const preset = pickPreset(c.name, index);
            return (
              <CapacityCard
                key={c.id || index}
                label={c.name || c.id}
                accent={preset.accent}
                bg={preset.bg}
                border={preset.border}
                icon={preset.icon}
                value={Number(c.total || 0)}
                onChange={(v) =>
                  setCapacities((prev) =>
                    (prev || []).map((p) =>
                      p.id === c.id ? { ...p, total: Number(v || 0) } : p
                    )
                  )
                }
                disabled={!canEdit}
              />
            );
          })}
        </div>

        <div className="syscfg__totalRow">
          <div>
            <div className="syscfg__totalTitle">Total Parking Capacity</div>
            <div className="syscfg__totalSub">Combined capacity for all vehicle types</div>
          </div>
          <div className="syscfg__totalValue">
            <div className="syscfg__totalNumber">{totalCapacity.toLocaleString()}</div>
            <div className="syscfg__totalLabel">Total Spaces</div>
          </div>
        </div>
      </div>

      <div className="syscfg__card syscfg__card--tight">
        <SectionHeader
          icon={motorcycleIcon}
          iconBg="#E0E7FF"
          title="Entry Session Settings"
          subtitle="Configure time-based parameters for entry sessions"
        />

        <div className="syscfg__field">
          <label className="syscfg__label">Minimum Time to Free Entry Session</label>
          <div className="syscfg__help">
            The minimum amount of time (in minutes) a vehicle must stay before the entry session can be marked as
            free/complimentary
          </div>

          <div className="syscfg__row">
            <input
              className="syscfg__numberInput syscfg__numberInput--wide"
              type="number"
              min={0}
              step={1}
              value={freeMinutes}
              onChange={(e) => setFreeMinutes(Number(e.target.value || 0))}
              inputMode="numeric"
              disabled={!canEdit}
            />
            <div className="syscfg__unit">minutes</div>
          </div>

          <div className="syscfg__info">
            <div className="syscfg__infoTitle">
              Entry sessions shorter than <strong>{freeMinutes} minutes</strong> will be eligible for free parking or
              promotional offers.
            </div>
            <div className="syscfg__infoText">
              This helps prevent abuse of short-term parking and maintains fair usage policies.
            </div>
          </div>
        </div>
      </div>

      <div className="syscfg__actions">
        <button
          type="button"
          className="syscfg__saveBtn"
          onClick={handleSave}
          disabled={!canEdit || saving}
          title={!canEdit ? 'You do not have permission to edit configuration' : undefined}
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
