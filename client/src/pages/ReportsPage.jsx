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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
    if (quickRange) params.set('quickRange', quickRange);
    else {
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
    }
    return params.toString();
  }, [quickRange, fromDate, toDate]);

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

    const loadData = async () => {
      try {
        if (activeTab === 'overview') {
          await Promise.all([fetchOverview(), fetchRevenueTrend()]);
        } else if (activeTab === 'staff') {
          await fetchStaff();
        } else if (activeTab === 'detailed') {
          await Promise.all([fetchVehicleTypes(), fetchCardCategories(), fetchHourly()]);
        } else if (activeTab === 'period') {
          await fetchTimePeriod();
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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
    { id: 'detailed', label: 'Detailed Report', Icon: ReportsDetailedTabIcon },
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

      {activeTab === 'staff' ? (
        <>
          <section className="reports-kpis reports-kpis--staff" aria-label="Staff metrics">
            {staffKpis.map((k) => (
              <div key={k.id} className="reports-kpiCard">
                <div className="reports-kpiLabel">{k.label}</div>
                <div className={`reports-kpiValue reports-kpiValue--${k.tone}`}>{k.value}</div>
              </div>
            ))}
          </section>

          <section className="reports-panel" aria-label="Staff revenue performance">
            <div className="reports-panelTitle">Staff Revenue Performance</div>
            <div className="reports-chartPlaceholder" role="img" aria-label="Staff revenue bar chart (placeholder)" />
            <div className="reports-chartLegend">Revenue ($)</div>
          </section>

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
      ) : activeTab === 'detailed' ? (
        <>
          <section className="reports-panel" aria-label="Revenue breakdown by vehicle type">
            <div className="reports-panelTitle">Revenue Breakdown by Vehicle Type</div>
            <div
              className="reports-chartPlaceholder reports-chartPlaceholder--tall"
              role="img"
              aria-label="Revenue breakdown chart (placeholder)"
            />
            <div className="reports-chartLegend">Revenue ($)</div>
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

          <section className="reports-panel" aria-label="Revenue by card type">
            <div className="reports-periodTitle">Revenue by Card Category</div>
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
                  {cardCategoriesData.map((r) => (
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
      ) : activeTab === 'period' ? (
        <>
          <section className="reports-panel reports-periodFilter" aria-label="Time period filters">
            <div className="reports-periodFilterGrid">
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

              <button className="reports-apply" type="button" onClick={handleApplyFilter}>
                Apply Filter
              </button>
            </div>
          </section>

          <div className="reports-periodSwitch" role="group" aria-label="Time period grouping">
            <button
              className={`reports-periodBtn ${periodGrouping === 'day' ? 'active' : ''}`}
              type="button"
              onClick={() => setPeriodGrouping('day')}
            >
              By day
            </button>
            <button
              className={`reports-periodBtn ${periodGrouping === 'week' ? 'active' : ''}`}
              type="button"
              onClick={() => setPeriodGrouping('week')}
            >
              By week
            </button>
            <button
              className={`reports-periodBtn ${periodGrouping === 'month' ? 'active' : ''}`}
              type="button"
              onClick={() => setPeriodGrouping('month')}
            >
              By month
            </button>
          </div>

          <section className="reports-panel" aria-label="Daily revenue comparison">
            <div className="reports-panelTitle">Revenue Comparison</div>
            <div className="reports-chartPlaceholder" role="img" aria-label="Revenue comparison chart (placeholder)" />
            <div className="reports-chartLegend">Revenue ($)</div>
          </section>

          <section className="reports-panel" aria-label="Revenue details">
            <div className="reports-periodTitle">Revenue Details</div>
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

              <div className="reports-tableFooter">
                <div className="reports-tableCount">Showing {timePeriodData.length} results</div>
              </div>
            </div>
          </section>
        </>
      ) : (
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
            <div className="reports-panelTitle">Revenue Trend</div>
            <div className="reports-chartPlaceholder" role="img" aria-label="Revenue chart (placeholder)" />
            <div className="reports-chartLegend">Revenue ($)</div>
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
                  {revenueTrendData.map((r) => {
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
