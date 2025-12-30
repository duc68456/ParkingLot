import '../styles/pages/ReportsPage.css';

import {
  ExportReportIcon,
  ReportsDetailedTabIcon,
  ReportsOverviewTabIcon,
  ReportsStaffTabIcon,
  ReportsTimePeriodTabIcon,
} from '../assets/icons/reports';
import { useMemo, useState } from 'react';

// Uses mock data to match the Figma layout.
// TODO: Replace with real analytics data from server.
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [periodGrouping, setPeriodGrouping] = useState('day');

  // Date inputs are UI-only for now.
  // TODO: Wire to backend analytics.
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const kpis = [
    { id: 'opening', label: 'Opening Balance', value: '$45,230', tone: 'neutral' },
    { id: 'revenue', label: 'Total Revenue', value: '+$3,200', tone: 'success' },
    { id: 'closing', label: 'Closing Balance', value: '$48,430', tone: 'neutral' },
    { id: 'tx', label: 'Total Transactions', value: '324', tone: 'primary' },
    { id: 'avg', label: 'Avg Transaction', value: '$9.88', tone: 'purple' },
  ];

  const staffKpis = [
    { id: 'staff', label: 'Total Staff', value: '4', tone: 'neutral' },
    { id: 'shifts', label: 'Total Shifts', value: '65', tone: 'primary' },
    { id: 'processed', label: 'Total Processed', value: '1022', tone: 'purple' },
    { id: 'revenue', label: 'Total Revenue', value: '$15060.00', tone: 'success' },
  ];

  const staffRows = [
    {
      id: 'john',
      name: 'John Doe',
      pin: '123456',
      shifts: 15,
      entries: 234,
      exits: 228,
      revenue: 3420,
      avgShift: 228,
    },
    {
      id: 'sarah',
      name: 'Sarah Smith',
      pin: '234567',
      shifts: 18,
      entries: 289,
      exits: 285,
      revenue: 4275,
      avgShift: 237.5,
    },
    {
      id: 'mike',
      name: 'Mike Johnson',
      pin: '345678',
      shifts: 12,
      entries: 187,
      exits: 183,
      revenue: 2745,
      avgShift: 228.75,
    },
    {
      id: 'lisa',
      name: 'Lisa Chen',
      pin: '456789',
      shifts: 20,
      entries: 312,
      exits: 308,
      revenue: 4620,
      avgShift: 231,
    },
  ];

  const staffHighlights = useMemo(() => {
    const topRevenue = [...staffRows].sort((a, b) => b.revenue - a.revenue)[0];
    const mostEntries = [...staffRows].sort((a, b) => b.entries - a.entries)[0];
    const bestAvg = [...staffRows].sort((a, b) => b.avgShift - a.avgShift)[0];

    return {
      topRevenue,
      mostEntries,
      bestAvg,
    };
  }, [staffRows]);

  const salesSummary = [
    { id: 'cash', title: 'Cash Payments', value: '$1,850', hint: '58% of total', tone: 'blue' },
    { id: 'card', title: 'Card Payments', value: '$1,120', hint: '35% of total', tone: 'purple' },
    { id: 'subs', title: 'Subscriptions', value: '$230', hint: '7% of total', tone: 'green' },
  ];

  const tabs = [
    { id: 'overview', label: 'General Overview', Icon: ReportsOverviewTabIcon },
    { id: 'detailed', label: 'Detailed Report', Icon: ReportsDetailedTabIcon },
    { id: 'period', label: 'Time Period', Icon: ReportsTimePeriodTabIcon },
    { id: 'staff', label: 'Staff Report', Icon: ReportsStaffTabIcon },
  ];

  const detailedVehicleCards = [
    {
      id: 'car',
      title: 'Car',
      vehicles: 145,
      total: 2175,
      average: 15,
      tone: 'blue',
      icon: '🚗',
    },
    {
      id: 'motorcycle',
      title: 'Motorcycle',
      vehicles: 98,
      total: 980,
      average: 10,
      tone: 'purple',
      icon: '🏍️',
    },
    {
      id: 'truck',
      title: 'Truck',
      vehicles: 42,
      total: 1050,
      average: 25,
      tone: 'orange',
      icon: '🚚',
    },
    {
      id: 'van',
      title: 'Van',
      vehicles: 39,
      total: 780,
      average: 20,
      tone: 'green',
      icon: '🚐',
    },
  ];

  const cardTypeRows = [
    { id: 'standard', type: 'Standard', transactions: 189, revenue: 1890, percentage: 37.9 },
    { id: 'premium', type: 'Premium', transactions: 87, revenue: 1305, percentage: 26.2 },
    { id: 'vip', type: 'VIP', transactions: 48, revenue: 960, percentage: 19.3 },
  ];

  const hourlyRows = [
    { id: '6-9', period: '6-9 AM', entries: 45, exits: 12, revenue: 585 },
    { id: '9-12', period: '9-12 PM', entries: 67, exits: 58, revenue: 720 },
    { id: '12-3', period: '12-3 PM', entries: 52, exits: 61, revenue: 805 },
    { id: '3-6', period: '3-6 PM', entries: 48, exits: 73, revenue: 895 },
    { id: '6-9pm', period: '6-9 PM', entries: 38, exits: 54, revenue: 660 },
    { id: '9-12am', period: '9-12 AM', entries: 22, exits: 28, revenue: 390 },
  ];

  const formatMoney = (n) => {
    if (typeof n !== 'number' || Number.isNaN(n)) return '$0.00';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const periodRows = [
    { id: 'dec12', label: 'Dec 12', revenue: 2850, trend: null },
    { id: 'dec13', label: 'Dec 13', revenue: 3100, trend: 8.8 },
    { id: 'dec14', label: 'Dec 14', revenue: 2950, trend: -4.8 },
    { id: 'dec15', label: 'Dec 15', revenue: 3250, trend: 10.2 },
    { id: 'dec16', label: 'Dec 16', revenue: 2900, trend: -10.8 },
    { id: 'dec17', label: 'Dec 17', revenue: 3350, trend: 15.5 },
    { id: 'dec18', label: 'Dec 18', revenue: 3200, trend: -4.5 },
  ];

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
                          <div className="reports-staffPin">PIN: {r.pin}</div>
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
                <div className="reports-tablePager" role="group" aria-label="Staff table pagination">
                  <button className="reports-tablePagerBtn" type="button" disabled>
                    Previous
                  </button>
                  <button className="reports-tablePagerBtn" type="button" disabled>
                    Next
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="reports-highlights" aria-label="Staff highlights">
            <div className="reports-highlightCard reports-highlightCard--gold">
              <div className="reports-highlightTop">
                <div className="reports-highlightIcon" aria-hidden="true">
                  🏆
                </div>
                <div>
                  <div className="reports-highlightLabel">Top Revenue</div>
                  <div className="reports-highlightName">{staffHighlights.topRevenue?.name}</div>
                </div>
              </div>
              <div className="reports-highlightValue">{formatMoney(staffHighlights.topRevenue?.revenue)}</div>
              <div className="reports-highlightHint">{staffHighlights.topRevenue?.shifts} shifts completed</div>
            </div>

            <div className="reports-highlightCard reports-highlightCard--blue">
              <div className="reports-highlightTop">
                <div className="reports-highlightIcon" aria-hidden="true">
                  ⚡
                </div>
                <div>
                  <div className="reports-highlightLabel">Most Entries</div>
                  <div className="reports-highlightName">{staffHighlights.mostEntries?.name}</div>
                </div>
              </div>
              <div className="reports-highlightValue">{staffHighlights.mostEntries?.entries}</div>
              <div className="reports-highlightHint">
                {(staffHighlights.mostEntries?.entries / staffHighlights.mostEntries?.shifts).toFixed(1)} entries/shift avg
              </div>
            </div>

            <div className="reports-highlightCard reports-highlightCard--green">
              <div className="reports-highlightTop">
                <div className="reports-highlightIcon" aria-hidden="true">
                  📈
                </div>
                <div>
                  <div className="reports-highlightLabel">Best Avg/Shift</div>
                  <div className="reports-highlightName">{staffHighlights.bestAvg?.name}</div>
                </div>
              </div>
              <div className="reports-highlightValue">{formatMoney(staffHighlights.bestAvg?.avgShift)}</div>
              <div className="reports-highlightHint">Highest efficiency</div>
            </div>
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
              {detailedVehicleCards.map((c) => (
                <div key={c.id} className="reports-detailedCard">
                  <div className="reports-detailedTop">
                    <div className={`reports-detailedIcon reports-detailedIcon--${c.tone}`} aria-hidden="true">
                      {c.icon}
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
            <div className="reports-periodTitle">Revenue by Card Type</div>
            <div className="reports-tableWrap reports-tableWrap--panel">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Card Type</th>
                    <th>Transactions</th>
                    <th>Revenue</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {cardTypeRows.map((r) => (
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
                <div className="reports-tableCount">Showing {cardTypeRows.length} results</div>
                <div className="reports-tablePager" role="group" aria-label="Card type table pagination">
                  <button className="reports-tablePagerBtn" type="button" disabled>
                    Previous
                  </button>
                  <button className="reports-tablePagerBtn" type="button" disabled>
                    Next
                  </button>
                </div>
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
                  {hourlyRows.map((r) => (
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
                <div className="reports-tableCount">Showing {hourlyRows.length} results</div>
                <div className="reports-tablePager" role="group" aria-label="Hourly table pagination">
                  <button className="reports-tablePagerBtn" type="button" disabled>
                    Previous
                  </button>
                  <button className="reports-tablePagerBtn" type="button" disabled>
                    Next
                  </button>
                </div>
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

              <button className="reports-apply" type="button">
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
            <div className="reports-panelTitle">Daily Revenue Comparison</div>
            <div className="reports-chartPlaceholder" role="img" aria-label="Daily revenue comparison chart (placeholder)" />
            <div className="reports-chartLegend">Revenue ($)</div>
          </section>

          <section className="reports-panel" aria-label="Daily revenue details">
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
                  {periodRows.map((r) => {
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
                <div className="reports-tableCount">Showing {periodRows.length} results</div>
                <div className="reports-tablePager" role="group" aria-label="Revenue table pagination">
                  <button className="reports-tablePagerBtn" type="button" disabled>
                    Previous
                  </button>
                  <button className="reports-tablePagerBtn" type="button" disabled>
                    Next
                  </button>
                </div>
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
            <div className="reports-panelTitle">Daily Revenue Trend (Last 7 Days)</div>
            <div className="reports-chartPlaceholder" role="img" aria-label="Daily revenue chart (placeholder)" />
            <div className="reports-chartLegend">Revenue ($)</div>
          </section>

          <section className="reports-panel" aria-label="Total sales summary">
            <div className="reports-panelTitle">Total Sales Summary</div>
            <div className="reports-summaryGrid">
              {salesSummary.map((s) => (
                <div key={s.id} className={`reports-summaryCard reports-summaryCard--${s.tone}`}>
                  <div className="reports-summaryTop">
                    <div className="reports-summaryTitle">{s.title}</div>
                    <div className="reports-summaryBadge" aria-hidden="true">$</div>
                  </div>
                  <div className="reports-summaryValue">{s.value}</div>
                  <div className="reports-summaryHint">{s.hint}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
