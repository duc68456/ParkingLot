import '../styles/pages/ReportsPage.css';

import {
  ExportReportIcon,
  ReportsDetailedTabIcon,
  ReportsOverviewTabIcon,
  ReportsStaffTabIcon,
  ReportsTimePeriodTabIcon,
} from '../assets/icons/reports';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Custom colors for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

export default function ReportsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [periodGrouping, setPeriodGrouping] = useState('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Date range filter
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [quickRange, setQuickRange] = useState('week');

  // Month/Year pickers for Week/Month views
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [revenueTrendData, setRevenueTrendData] = useState([]);
  const [staffData, setStaffData] = useState(null);
  const [vehicleTypesData, setVehicleTypesData] = useState([]);
  const [cardCategoriesData, setCardCategoriesData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [timePeriodData, setTimePeriodData] = useState([]);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : ''
  }), [token]);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (activeTab === 'period') {
      // Period tab uses transparency controls
      params.set('month', selectedMonth);
      params.set('year', selectedYear);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
    } else {
      if (quickRange) params.set('quickRange', quickRange);
      else {
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);
      }
    }
    return params.toString();
  }, [quickRange, fromDate, toDate, activeTab, selectedMonth, selectedYear]);

  // Fetch Overview data
  const fetchOverview = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/overview?${buildQueryString()}`, {
        headers: authHeaders()
      });
      const json = await res.json();
      if (json.success) setOverviewData(json.data);
    } catch (e) {
      console.error('Failed to fetch overview:', e);
    }
  }, [token, authHeaders, buildQueryString]);

  // Fetch Revenue Trend
  const fetchRevenueTrend = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/revenue-trend?${buildQueryString()}&period=day`, {
        headers: authHeaders()
      });
      const json = await res.json();
      if (json.success) setRevenueTrendData(json.data.items || []);
    } catch (e) {
      console.error('Failed to fetch revenue trend:', e);
    }
  }, [token, authHeaders, buildQueryString]);

  // Fetch Staff data
  const fetchStaff = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/staff?${buildQueryString()}`, {
        headers: authHeaders()
      });
      const json = await res.json();
      if (json.success) setStaffData(json.data);
    } catch (e) {
      console.error('Failed to fetch staff:', e);
    }
  }, [token, authHeaders, buildQueryString]);

  // Fetch Vehicle Types
  const fetchVehicleTypes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/detailed/vehicle-types?${buildQueryString()}`, {
        headers: authHeaders()
      });
      const json = await res.json();
      if (json.success) setVehicleTypesData(json.data.items || []);
    } catch (e) {
      console.error('Failed to fetch vehicle types:', e);
    }
  }, [token, authHeaders, buildQueryString]);

  // Fetch Card Categories
  const fetchCardCategories = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/detailed/card-categories?${buildQueryString()}`, {
        headers: authHeaders()
      });
      const json = await res.json();
      if (json.success) setCardCategoriesData(json.data.items || []);
    } catch (e) {
      console.error('Failed to fetch card categories:', e);
    }
  }, [token, authHeaders, buildQueryString]);

  // Fetch Hourly data
  const fetchHourly = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/detailed/hourly?${buildQueryString()}`, {
        headers: authHeaders()
      });
      const json = await res.json();
      if (json.success) setHourlyData(json.data.items || []);
    } catch (e) {
      console.error('Failed to fetch hourly:', e);
    }
  }, [token, authHeaders, buildQueryString]);

  // Fetch Time Period data
  const fetchTimePeriod = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/time-period?${buildQueryString()}&period=${periodGrouping}`, {
        headers: authHeaders()
      });
      const json = await res.json();
      if (json.success) setTimePeriodData(json.data.items || []);
    } catch (e) {
      console.error('Failed to fetch time period:', e);
    }
  }, [token, authHeaders, buildQueryString, periodGrouping]);

  // Load data based on active tab
  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError('');

    (async () => {
      try {
        if (activeTab === 'overview') {
          await Promise.all([fetchOverview(), fetchRevenueTrend()]);
        } else if (activeTab === 'staff') {
          await fetchStaff();
        } else if (activeTab === 'vehicle') {
          // Previously 'detailed'
          await Promise.all([fetchVehicleTypes(), fetchHourly()]);
        } else if (activeTab === 'card') {
          await fetchCardCategories();
        } else if (activeTab === 'period') {
          await fetchTimePeriod();
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTab, quickRange, fromDate, toDate, periodGrouping, token, fetchOverview, fetchRevenueTrend, fetchStaff, fetchVehicleTypes, fetchCardCategories, fetchHourly, fetchTimePeriod]);

  const formatMoney = (n) => {
    if (typeof n !== 'number' || Number.isNaN(n)) return '$0.00';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const formatPct = (n) => {
    if (typeof n !== 'number' || Number.isNaN(n)) return '-';
    const abs = Math.abs(n).toFixed(1);
    return `${abs}%`;
  };

  const trendMeta = (trend) => {
    if (typeof trend !== 'number' || Number.isNaN(trend)) return { dir: 'flat', label: '-' };
    if (trend > 0) return { dir: 'up', label: formatPct(trend) };
    if (trend < 0) return { dir: 'down', label: formatPct(trend) };
    return { dir: 'flat', label: '0.0%' };
  };

  // Build KPIs from overview data
  const kpis = useMemo(() => {
    if (!overviewData) return [];
    return [
      { id: 'vehicles', label: 'Vehicles In Parking', value: String(overviewData.vehiclesInParking || 0), tone: 'neutral' },
      { id: 'revenue', label: 'Total Revenue', value: formatMoney(overviewData.totalRevenue || 0), tone: 'success' },
      { id: 'tx', label: 'Total Transactions', value: String(overviewData.totalTransactions || 0), tone: 'primary' },
      { id: 'avg', label: 'Avg Transaction', value: formatMoney(overviewData.avgTransaction || 0), tone: 'purple' },
    ];
  }, [overviewData]);

  // Build Staff KPIs
  const staffKpis = useMemo(() => {
    if (!staffData?.kpis) return [];
    const k = staffData.kpis;
    return [
      { id: 'staff', label: 'Total Staff', value: String(k.totalStaff || 0), tone: 'neutral' },
      { id: 'shifts', label: 'Total Shifts', value: String(k.totalShifts || 0), tone: 'primary' },
      { id: 'processed', label: 'Total Processed', value: String(k.totalProcessed || 0), tone: 'purple' },
      { id: 'revenue', label: 'Total Revenue', value: formatMoney(k.totalRevenue || 0), tone: 'success' },
    ];
  }, [staffData]);

  const staffRows = staffData?.staff || [];
  const staffHighlights = staffData?.highlights || {};

  const tabs = [
    { id: 'overview', label: 'General Overview', Icon: ReportsOverviewTabIcon },
    { id: 'vehicle', label: 'Vehicle Report', Icon: ReportsDetailedTabIcon }, // Reusing Detailed icon (chart)
    { id: 'card', label: 'Card Report', Icon: ReportsDetailedTabIcon }, // Reusing Detailed icon
    { id: 'period', label: 'Time Period', Icon: ReportsTimePeriodTabIcon },
    { id: 'staff', label: 'Staff Report', Icon: ReportsStaffTabIcon },
  ];

  const vehicleIcons = { car: '🚗', motor: '🏍️', truck: '🚚', van: '🚐', bus: '🚌' };
  const getVehicleIcon = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('motor') || lower.includes('bike')) return vehicleIcons.motor;
    if (lower.includes('truck')) return vehicleIcons.truck;
    if (lower.includes('van')) return vehicleIcons.van;
    if (lower.includes('bus')) return vehicleIcons.bus;
    return vehicleIcons.car;
  };

  const handleApplyFilter = () => {
    setQuickRange('');
  };

  const handleQuickRange = (range) => {
    setQuickRange(range);
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="reports">
      <div className="reports-top">
        <div className="reports-heading">
          <div className="reports-title">Reports</div>
          <div className="reports-subtitle">Comprehensive revenue and performance analytics</div>
        </div>
        <button className="reports-export" type="button">
          <ExportReportIcon className="reports-exportIcon" aria-hidden="true" focusable="false" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Quick Range Filters */}
      <div className="reports-quickFilters">
        {['today', 'week', 'month', 'year'].map((range) => (
          <button
            key={range}
            type="button"
            className={`reports-quickBtn ${quickRange === range ? 'active' : ''}`}
            onClick={() => handleQuickRange(range)}
          >
            {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'This Year'}
          </button>
        ))}
      </div>

      <div className="reports-tabs" role="tablist" aria-label="Report sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`reports-tab ${activeTab === t.id ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === t.id ? 'true' : 'false'}
            onClick={() => setActiveTab(t.id)}
          >
            <t.Icon className="reports-tabIcon" aria-hidden="true" focusable="false" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {loading && <div className="reports-loading">Loading...</div>}
      {error && <div className="reports-error">{error}</div>}

      {/* STAFF TAB */}
      {activeTab === 'staff' && (
        <>
          <section className="reports-kpis reports-kpis--staff" aria-label="Staff metrics">
            {staffKpis.map((k) => (
              <div key={k.id} className="reports-kpiCard">
                <div className="reports-kpiLabel">{k.label}</div>
                <div className={`reports-kpiValue reports-kpiValue--${k.tone}`}>{k.value}</div>
              </div>
            ))}
          </section>
          {/* ... Staff Charts/Tables (kept as is, simplified for brevity in thought, but must retain content) ... */}
          <section className="reports-panel" aria-label="Staff revenue performance">
            <div className="reports-panelTitle">Staff Revenue Performance</div>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <BarChart data={staffRows} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" barSize={60} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          {/* Keeping existing staff rows logic */}
          <section className="reports-panel" aria-label="Individual staff performance">
            <div className="reports-panelTitle">Individual Staff Performance</div>
            <div className="reports-tableWrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Shifts</th>
                    <th>Entries</th>
                    <th>Exits</th>
                    <th>Total Revenue</th>
                    <th>Avg/Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="reports-staffCell">
                          <div className="reports-staffName">{r.name}</div>
                          <div className="reports-staffType">{r.employeeType}</div>
                        </div>
                      </td>
                      <td>{r.shifts}</td>
                      <td>{r.entries}</td>
                      <td>{r.exits}</td>
                      <td className="reports-money reports-money--success">{formatMoney(r.revenue)}</td>
                      <td className="reports-money">{formatMoney(r.avgShift)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="reports-tableFooter">
                <div className="reports-tableCount">Showing {staffRows.length} results</div>
              </div>
            </div>
          </section>

          <section className="reports-highlights" aria-label="Staff highlights">
            {staffHighlights.topRevenue && (
              <div className="reports-highlightCard reports-highlightCard--gold">
                <div className="reports-highlightTop">
                  <div className="reports-highlightIcon" aria-hidden="true">🏆</div>
                  <div>
                    <div className="reports-highlightLabel">Top Revenue</div>
                    <div className="reports-highlightName">{staffHighlights.topRevenue?.name}</div>
                  </div>
                </div>
                <div className="reports-highlightValue">{formatMoney(staffHighlights.topRevenue?.revenue)}</div>
                <div className="reports-highlightHint">{staffHighlights.topRevenue?.shifts} shifts completed</div>
              </div>
            )}
            {/* ... other highlights ... */}
            {staffHighlights.mostEntries && (
              <div className="reports-highlightCard reports-highlightCard--blue">
                <div className="reports-highlightTop">
                  <div className="reports-highlightIcon" aria-hidden="true">⚡</div>
                  <div>
                    <div className="reports-highlightLabel">Most Entries</div>
                    <div className="reports-highlightName">{staffHighlights.mostEntries?.name}</div>
                  </div>
                </div>
                <div className="reports-highlightValue">{staffHighlights.mostEntries?.entries}</div>
                <div className="reports-highlightHint">
                  {staffHighlights.mostEntries?.shifts > 0 ? (staffHighlights.mostEntries?.entries / staffHighlights.mostEntries?.shifts).toFixed(1) : 0} entries/shift avg
                </div>
              </div>
            )}

            {staffHighlights.bestAvg && (
              <div className="reports-highlightCard reports-highlightCard--green">
                <div className="reports-highlightTop">
                  <div className="reports-highlightIcon" aria-hidden="true">📈</div>
                  <div>
                    <div className="reports-highlightLabel">Best Avg/Shift</div>
                    <div className="reports-highlightName">{staffHighlights.bestAvg?.name}</div>
                  </div>
                </div>
                <div className="reports-highlightValue">{formatMoney(staffHighlights.bestAvg?.avgShift)}</div>
                <div className="reports-highlightHint">Highest efficiency</div>
              </div>
            )}
          </section>
        </>
      )}

      {/* VEHICLE TAB */}
      {activeTab === 'vehicle' && (
        <>
          <section className="reports-panel" aria-label="Revenue breakdown by vehicle type">
            <div className="reports-panelTitle">Revenue Breakdown by Vehicle Type</div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={vehicleTypesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="title" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Bar dataKey="total" fill="#3b82f6" name="Revenue">
                    {vehicleTypesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="reports-panel" aria-label="Detailed vehicle revenue">
            <div className="reports-periodTitle">Detailed Vehicle Revenue</div>
            <div className="reports-detailedGrid">
              {vehicleTypesData.map((c) => (
                <div key={c.id} className="reports-detailedCard">
                  <div className="reports-detailedTop">
                    <div className="reports-detailedIcon reports-detailedIcon--blue" aria-hidden="true">
                      {getVehicleIcon(c.title)}
                    </div>
                    <div className="reports-detailedMeta">
                      <div className="reports-detailedTitle">{c.title}</div>
                      <div className="reports-detailedSub">{c.vehicles} vehicles</div>
                    </div>
                  </div>

                  <div className="reports-detailedStats">
                    <div className="reports-detailedStat">
                      <span className="reports-detailedKey">Total:</span>
                      <span className="reports-detailedVal">{formatMoney(c.total)}</span>
                    </div>
                    <div className="reports-detailedStat">
                      <span className="reports-detailedKey">Average:</span>
                      <span className="reports-detailedVal">{formatMoney(c.average)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="reports-panel" aria-label="Hourly transaction breakdown">
            <div className="reports-periodTitle">Hourly Transaction Breakdown</div>
            <div className="reports-tableWrap reports-tableWrap--panel">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Time Period</th>
                    <th>Entries</th>
                    <th>Exits</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyData.map((r) => (
                    <tr key={r.id}>
                      <td className="reports-muted">{r.period}</td>
                      <td>{r.entries}</td>
                      <td>{r.exits}</td>
                      <td className="reports-money reports-money--success">{formatMoney(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="reports-tableFooter">
                <div className="reports-tableCount">Showing {hourlyData.length} results</div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* CARD TAB */}
      {activeTab === 'card' && (
        <>
          <section className="reports-panel" aria-label="Revenue by card type chart">
            <div className="reports-panelTitle">Revenue by Card Category (Chart)</div>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <BarChart data={cardCategoriesData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(val) => `$${val}`} />
                  <YAxis dataKey="type" type="category" width={100} />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue">
                    {cardCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="reports-panel" aria-label="Revenue by card type">
            <div className="reports-periodTitle">Revenue by Card Category (Table)</div>
            <div className="reports-tableWrap reports-tableWrap--panel">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Card Category</th>
                    <th>Transactions</th>
                    <th>Revenue</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {cardCategoriesData.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No data available</td></tr>
                  ) : cardCategoriesData.map((r) => (
                    <tr key={r.id}>
                      <td className="reports-muted">{r.type}</td>
                      <td>{r.transactions}</td>
                      <td className="reports-money reports-money--success">{formatMoney(r.revenue)}</td>
                      <td>{r.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="reports-tableFooter">
                <div className="reports-tableCount">Showing {cardCategoriesData.length} results</div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* PERIOD TAB */}
      {activeTab === 'period' && (
        <>
          <div className="reports-periodSwitch" role="group" aria-label="Time period grouping">
            <button
              className={`reports-periodBtn ${periodGrouping === 'day' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setPeriodGrouping('day');
                setRevenueTrendData([]);
                setTimePeriodData([]);
                // Default: Current week (Mon-Sun)
                const now = new Date();
                const day = now.getDay() || 7; // Get current day number, convert Sun(0) to 7
                if (day !== 1) now.setHours(-24 * (day - 1)); // Go back to Monday
                const startOfWeek = now.toISOString().split('T')[0];

                const end = new Date(now);
                end.setDate(end.getDate() + 6);
                const endOfWeek = end.toISOString().split('T')[0];

                setFromDate(startOfWeek);
                setToDate(endOfWeek);
              }}
            >
              By Day
            </button>
            <button
              className={`reports-periodBtn ${periodGrouping === 'week' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setPeriodGrouping('week');
                setRevenueTrendData([]);
                setTimePeriodData([]);
                // Default: Current Month (already handled by state init, but explicit set is safe)
                setSelectedMonth(new Date().getMonth() + 1);
                setSelectedYear(new Date().getFullYear());
              }}
            >
              By Week
            </button>
            <button
              className={`reports-periodBtn ${periodGrouping === 'month' ? 'active' : ''}`}
              type="button"
              onClick={() => {
                setPeriodGrouping('month');
                setRevenueTrendData([]);
                setTimePeriodData([]);
                // Default: Prev Month - Current - Next Month
                const now = new Date();
                const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1st of Prev Month
                const next = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Last of Next Month

                // Format for type="month" input is YYYY-MM. 
                // But fromDate state expect full date string YYYY-MM-DD for API?
                // Wait, my input type="month" logic uses substring(0,7). 
                // And onChange sets full date.
                // So I should set full date here.
                setFromDate(prev.toISOString().split('T')[0]);
                setToDate(next.toISOString().split('T')[0]);
              }}
            >
              By Month
            </button>
          </div>

          <section className="reports-panel reports-periodFilter" aria-label="Time period filters">
            <div className="reports-periodFilterGrid">
              {periodGrouping === 'day' && (
                <>
                  <label className="reports-field">
                    <div className="reports-fieldLabel">From Date</div>
                    <input
                      className="reports-dateInput"
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </label>
                  <label className="reports-field">
                    <div className="reports-fieldLabel">To Date</div>
                    <input
                      className="reports-dateInput"
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </label>
                </>
              )}

              {periodGrouping === 'week' && (
                <>
                  <label className="reports-field">
                    <div className="reports-fieldLabel">Month</div>
                    <select
                      className="reports-select"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                  </label>
                  <label className="reports-field">
                    <div className="reports-fieldLabel">Year</div>
                    <select
                      className="reports-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {periodGrouping === 'month' && (
                <>
                  <label className="reports-field">
                    <div className="reports-fieldLabel">From Month</div>
                    <input
                      className="reports-dateInput"
                      type="month"
                      value={fromDate.substring(0, 7)} // Safely handle YYYY-MM
                      onChange={(e) => setFromDate(`${e.target.value}-01`)}
                    />
                  </label>
                  <label className="reports-field">
                    <div className="reports-fieldLabel">To Month</div>
                    <input
                      className="reports-dateInput"
                      type="month"
                      value={toDate.substring(0, 7)}
                      onChange={(e) => setToDate(new Date(e.target.valueAsDate.getFullYear(), e.target.valueAsDate.getMonth() + 1, 0).toISOString().split('T')[0])}
                    />
                  </label>
                </>
              )}

              <button className="reports-apply" type="button" onClick={fetchTimePeriod}>
                Apply Filter
              </button>
            </div>
          </section>

          <section className="reports-panel" aria-label="Revenue comparison chart">
            <div className="reports-panelTitle">
              {periodGrouping === 'week' ? 'Weekly Revenue Comparison' :
                periodGrouping === 'month' ? 'Monthly Revenue Comparison' :
                  'Daily Revenue Comparison'}
            </div>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                {periodGrouping === 'month' ? (
                  <LineChart data={timePeriodData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                    <Tooltip formatter={(value) => formatMoney(value)} />
                    <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} name="Revenue" />
                  </LineChart>
                ) : (
                  <BarChart data={timePeriodData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                    <Tooltip formatter={(value) => formatMoney(value)} />
                    <Bar
                      dataKey="revenue"
                      fill={periodGrouping === 'week' ? '#3b82f6' : '#10b981'}
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                      barSize={periodGrouping === 'week' ? 60 : undefined}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>

          {/* Data Display: Table for Day, Cards for Week/Month */}
          {periodGrouping === 'day' ? (
            <section className="reports-panel" aria-label="Revenue details">
              <div className="reports-periodTitle">Daily Revenue Details</div>
              <div className="reports-tableWrap">
                <table className="reports-table reports-table--compact">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Revenue</th>
                      <th>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timePeriodData.map((r) => {
                      const meta = trendMeta(r.trend);
                      return (
                        <tr key={r.id}>
                          <td className="reports-muted">{r.label}</td>
                          <td className="reports-money reports-money--success">{formatMoney(r.revenue)}</td>
                          <td>
                            {meta.dir === 'flat' ? (
                              <span className="reports-trend reports-trend--flat">-</span>
                            ) : (
                              <span className={`reports-trend reports-trend--${meta.dir}`}>
                                <span className="reports-trendArrow" aria-hidden="true">
                                  {meta.dir === 'up' ? '↗' : '↘'}
                                </span>
                                {meta.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="reports-cardsGrid">
              {timePeriodData.map((r) => {
                const meta = trendMeta(r.trend);
                return (
                  <div key={r.id} className="reports-periodCard">
                    <div className="reports-periodCardLabel">{r.label}</div>
                    <div className="reports-periodCardValue">{formatMoney(r.revenue)}</div>
                    <div className="reports-periodCardTrend">
                      {meta.dir === 'flat' ? (
                        <span className="reports-trend reports-trend--flat">- from last {periodGrouping === 'week' ? 'week' : 'month'}</span>
                      ) : (
                        <span className={`reports-trend reports-trend--${meta.dir}`}>
                          <span className="reports-trendArrow" aria-hidden="true">
                            {meta.dir === 'up' ? '+' : ''}
                          </span>
                          {meta.label} from last {periodGrouping === 'week' ? 'week' : 'month'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          <section className="reports-kpis" aria-label="Key metrics">
            {kpis.map((k) => (
              <div key={k.id} className="reports-kpiCard">
                <div className="reports-kpiLabel">{k.label}</div>
                <div className={`reports-kpiValue reports-kpiValue--${k.tone}`}>{k.value}</div>
              </div>
            ))}
          </section>

          <section className="reports-panel" aria-label="Daily revenue trend">
            <div className="reports-panelHeader">
              <div className="reports-panelTitle">Revenue Trend</div>
              <div className="reports-panelMeta">
                {quickRange === 'today' ? 'Hourly' : quickRange === 'year' ? 'Monthly' : 'Daily'}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={revenueTrendData}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#6b7280' }}
                  interval={quickRange === 'month' ? 4 : quickRange === 'today' ? 3 : 'preserveStartEnd'}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
                  tick={{ fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => [formatMoney(value), 'Revenue']}
                  labelStyle={{ fontWeight: '600', marginBottom: '4px' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.revenue && payload.revenue > 0) {
                      return <circle cx={cx} cy={cy} r={4} stroke="#fff" strokeWidth={2} fill="#10b981" />;
                    }
                    return null;
                  }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Revenue Trend Table */}
          <section className="reports-panel" aria-label="Revenue trend details">
            <div className="reports-panelTitle">Revenue by Day</div>
            <div className="reports-tableWrap">
              <table className="reports-table reports-table--compact">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transactions</th>
                    <th>Revenue</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueTrendData.filter(r => r.revenue > 0).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                        No transactions found for this period
                      </td>
                    </tr>
                  )}
                  {revenueTrendData.filter(r => r.revenue > 0).map((r) => {
                    const meta = trendMeta(r.trend);
                    return (
                      <tr key={r.label}>
                        <td className="reports-muted">{r.label}</td>
                        <td>{r.transactions}</td>
                        <td className="reports-money reports-money--success">{formatMoney(r.revenue)}</td>
                        <td>
                          {meta.dir === 'flat' ? (
                            <span className="reports-trend reports-trend--flat">-</span>
                          ) : (
                            <span className={`reports-trend reports-trend--${meta.dir}`}>
                              <span className="reports-trendArrow" aria-hidden="true">
                                {meta.dir === 'up' ? '↗' : '↘'}
                              </span>
                              {meta.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
