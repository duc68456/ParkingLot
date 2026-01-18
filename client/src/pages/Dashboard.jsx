import '../styles/pages/Dashboard.css';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import CashIcon from '../assets/icons/dashboard/cash.svg?react';
import CarIcon from '../assets/icons/dashboard/car.svg?react';
import UsersIcon from '../assets/icons/dashboard/users.svg?react';
import PulseIcon from '../assets/icons/dashboard/pulse.svg?react';
import ArrowUpIcon from '../assets/icons/dashboard/arrow-up.svg?react';

import EntryActivityIcon from '../assets/icons/dashboard/activity-entry.svg?react';
import ExitActivityIcon from '../assets/icons/dashboard/activity-exit.svg?react';

import AlertWarningIcon from '../assets/icons/dashboard/alert-warning.svg?react';
import AlertDangerIcon from '../assets/icons/dashboard/alert-danger.svg?react';
import AlertInfoIcon from '../assets/icons/dashboard/alert-info.svg?react';

import CapacityCarsIcon from '../assets/icons/dashboard/capacity-cars.svg?react';
import CapacityMotorcyclesIcon from '../assets/icons/dashboard/capacity-motorcycles.svg?react';
import CapacityTrucksIcon from '../assets/icons/dashboard/capacity-trucks.svg?react';
import CapacityVansIcon from '../assets/icons/dashboard/capacity-vans.svg?react';

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [dailyDistribution, setDailyDistribution] = useState([]);
  const [gateWarnings, setGateWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

        // Fetch all dashboard data in parallel
        const [statsRes, activityRes, alertsRes, capacityRes, revenueTrendRes, dailyDistRes, gateWarningsRes] = await Promise.all([
          fetch(`${baseURL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${baseURL}/dashboard/recent-activity?limit=10`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${baseURL}/dashboard/alerts`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${baseURL}/dashboard/capacity`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${baseURL}/dashboard/revenue-trend?hours=6`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${baseURL}/dashboard/vehicle-distribution-today`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${baseURL}/dashboard/gate-warnings`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const statsData = await statsRes.json();
        const activityData = await activityRes.json();
        const alertsData = await alertsRes.json();
        const capacityData = await capacityRes.json();
        const revenueTrendData = await revenueTrendRes.json();
        const dailyDistData = await dailyDistRes.json();
        const gateWarningsData = await gateWarningsRes.json();

        if (statsData.success) {
          setStats(statsData.data);
        }
        if (activityData.success) {
          setRecentActivity(activityData.data);
        }
        if (alertsData.success) {
          setAlerts(alertsData.data);
        }
        if (capacityData.success) {
          setCapacity(capacityData.data);
        }
        if (revenueTrendData.success) {
          setRevenueTrend(revenueTrendData.data);
        }
        if (dailyDistData.success) {
          setDailyDistribution(dailyDistData.data);
        }
        if (gateWarningsData.success) {
          setGateWarnings(gateWarningsData.data?.warnings || []);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
      // Refresh every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    // Format as YYYY-MM-DD-HH-mm-ss for older dates
    const year = time.getFullYear();
    const month = String(time.getMonth() + 1).padStart(2, '0');
    const day = String(time.getDate()).padStart(2, '0');
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const seconds = String(time.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
  };

  // Build stats cards from API data
  const statsCards = stats ? [
    {
      id: 'revenue',
      title: "Today's Revenue",
      value: formatCurrency(stats.revenue.value),
      subtext: null,
      trend: {
        value: `${Math.abs(stats.revenue.trend).toFixed(1)}%`,
        direction: stats.revenue.trendDirection
      },
      color: 'green',
      icon: CashIcon,
    },
    {
      id: 'vehicles',
      title: 'Vehicles In Lot',
      value: stats.vehiclesInLot.value.toString(),
      subtext: `${stats.vehiclesInLot.capacityPercent}% Capacity`,
      trend: null,
      color: 'blue',
      icon: CarIcon,
    },
    {
      id: 'staff',
      title: 'Active Staff',
      value: stats.activeStaff.value.toString(),
      subtext: 'On Duty Now',
      trend: null,
      color: 'purple',
      icon: UsersIcon,
    },
    {
      id: 'entries',
      title: "Today's Entries",
      value: stats.todayEntries.value.toString(),
      subtext: null,
      trend: {
        value: `${Math.abs(stats.todayEntries.trend).toFixed(1)}%`,
        direction: stats.todayEntries.trendDirection
      },
      color: 'amber',
      icon: PulseIcon,
    },
  ] : [];

  // Map capacity data to display format
  const capacityCards = capacity.map(c => ({
    id: c.id,
    title: c.name,
    value: `${c.current} / ${c.max}`,
    percentLabel: `${c.percent}% Full`,
    percent: c.percent,
    tone: c.tone,
    current: c.current
  }));

  if (loading) {
    return (
      <div className="dashboard" style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard" style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <div>{error}</div>
      </div>
    );
  }

  const statsCardsToDisplay = [
    {
      id: 'revenue',
      title: "Today's Revenue",
      value: '$3,200',
      subtext: null,
      trend: { value: '12.5%', direction: 'up' },
      color: 'green',
      icon: CashIcon,
    },
    {
      id: 'vehicles',
      title: 'Vehicles In Lot',
      value: '853',
      subtext: '42% Capacity',
      trend: null,
      color: 'blue',
      icon: CarIcon,
    },
    {
      id: 'staff',
      title: 'Active Staff',
      value: '8',
      subtext: 'On Duty Now',
      trend: null,
      color: 'purple',
      icon: UsersIcon,
    },
    {
      id: 'entries',
      title: "Today's Entries",
      value: '324',
      subtext: null,
      trend: { value: '8.3%', direction: 'up' },
      color: 'amber',
      icon: PulseIcon,
    },
  ];

  const recentActivityToDisplay = [
    {
      id: 1,
      type: 'ENTRY',
      plate: 'ABC-1234',
      meta: 'John Doe • 2 mins ago',
      tone: 'blue',
      amount: null,
    },
    {
      id: 2,
      type: 'EXIT',
      plate: 'XYZ-5678',
      meta: 'Sarah Smith • 5 mins ago',
      tone: 'green',
      amount: '+$15.00',
    },
    {
      id: 3,
      type: 'ENTRY',
      plate: 'DEF-9012',
      meta: 'Mike Johnson • 8 mins ago',
      tone: 'blue',
      amount: null,
    },
    {
      id: 4,
      type: 'EXIT',
      plate: 'GHI-3456',
      meta: 'Lisa Chen • 12 mins ago',
      tone: 'green',
      amount: '+$22.50',
    },
  ];

  const alertsToDisplay = [
    {
      id: 1,
      tone: 'warning',
      title: 'Motorcycle parking 92% full (1104/1200)',
      time: '5 mins ago',
    },
    {
      id: 2,
      tone: 'danger',
      title: 'Card read error at Gate 3',
      time: '15 mins ago',
    },
    {
      id: 3,
      tone: 'info',
      title: 'Shift change due in 30 minutes',
      time: '30 mins ago',
    },
  ];

  const capacityToDisplay = [
    {
      id: 'cars',
      title: 'Cars',
      value: '245 / 500',
      percentLabel: '49% Full',
      percent: 49,
      tone: 'blue',
      current: 245,
    },
    {
      id: 'motorcycles',
      title: 'Motorcycles',
      value: '389 / 1200',
      percentLabel: '32% Full',
      percent: 32,
      tone: 'purple',
      current: 389,
    },
    {
      id: 'trucks',
      title: 'Trucks',
      value: '87 / 150',
      percentLabel: '58% Full',
      percent: 58,
      tone: 'orange',
      current: 87,
    },
    {
      id: 'vans',
      title: 'Vans',
      value: '132 / 200',
      percentLabel: '66% Full',
      percent: 66,
      tone: 'green',
      current: 132,
    },
  ];

  // Use real data if available, fallback to mock data
  const displayStats = statsCards.length > 0 ? statsCards : statsCardsToDisplay;
  const displayActivity = recentActivity.length > 0
    ? recentActivity.map(a => ({
      id: a.id,
      type: a.type,
      plate: a.plate,
      vehicleType: a.vehicleType,
      personName: a.personName,
      personType: a.personType,
      hasSubscription: a.hasSubscription,
      meta: `${a.personName} • ${formatRelativeTime(a.timestamp)}`,
      tone: a.type === 'ENTRY' ? 'blue' : 'green',
      amount: a.amount > 0 ? `+${formatCurrency(a.amount)}` : null
    }))
    : recentActivityToDisplay;

  // Use gate warnings for alerts if available, fallback to regular alerts or mock data
  const displayAlerts = gateWarnings.length > 0
    ? gateWarnings.slice(0, 10).map(w => ({
      id: w.ID || w._id || w.id,
      tone: w.Type === 'ENTRY' ? 'warning' : w.Type === 'EXIT' ? 'danger' : 'info',
      title: w.Message || 'Gate warning',
      time: formatRelativeTime(w.createdAt)
    }))
    : alerts.length > 0
      ? alerts.map(al => ({
        id: al.id,
        tone: al.tone,
        title: al.title,
        time: formatRelativeTime(al.timestamp)
      }))
      : alertsToDisplay;
  // Calculate total for percentage in tooltip
  const totalDailyVehicles = dailyDistribution.reduce((sum, item) => sum + item.value, 0);

  const displayCapacity = capacityCards.length > 0 ? capacityCards : capacityToDisplay;

  return (
    <div className="dashboard">
      <section className="dashboard-stats" aria-label="Key statistics">
        {displayStats.map((s) => (
          <div key={s.id} className="dashboard-statCard">
            <div className="dashboard-statCardTop">
              <div className={`dashboard-statIcon dashboard-statIcon--${s.color}`} aria-hidden="true">
                {s.icon ? <s.icon className="dashboard-statIconSvg" aria-hidden="true" focusable="false" /> : null}
              </div>
              {s.trend ? (
                <div className="dashboard-statTrend">
                  <ArrowUpIcon className="dashboard-statTrendArrow" aria-hidden="true" focusable="false" />
                  <span className="dashboard-statTrendValue">{s.trend.value}</span>
                </div>
              ) : null}
            </div>

            <div className="dashboard-statContent">
              <div className="dashboard-statLabel">{s.title}</div>
              <div className="dashboard-statValue">{s.value}</div>
              {s.subtext ? <div className="dashboard-statSubtext">{s.subtext}</div> : null}
            </div>
          </div>
        ))}
      </section>

      <section className="dashboard-row dashboard-row--charts" aria-label="Charts">
        <div className="dashboard-panel dashboard-panel--wide">
          <div className="dashboard-panelHeader">
            <div className="dashboard-panelTitle">Today's Revenue Trend</div>
            <div className="dashboard-panelMeta">Last 6 hours</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="hourLabel"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value) => [formatCurrency(value), 'Revenue']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panelHeader">
            <div className="dashboard-panelTitle">Vehicle Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dailyDistribution}
                dataKey="value"
                nameKey="title"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {dailyDistribution.map((entry, index) => {
                  // Enhanced color mapping for different vehicle types
                  const colorMap = {
                    blue: '#3b82f6',    // Cars - Blue
                    purple: '#8b5cf6',  // Motorcycles - Purple  
                    orange: '#f97316',  // Trucks - Orange
                    green: '#10b981'    // Vans/Buses - Green
                  };
                  // Generate unique color if tone is not in map
                  const colors = ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#eab308', '#06b6d4', '#ec4899'];
                  const color = colorMap[entry.tone] || colors[index % colors.length];
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value, name) => {
                  const percent = totalDailyVehicles > 0 ? ((value / totalDailyVehicles) * 100).toFixed(1) : 0;
                  return [`${value} entries (${percent}%)`, name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="dashboard-legend">
            {dailyDistribution.map((item) => (
              <div key={item.id} className="dashboard-legendItem">
                <span className={`dashboard-dot dashboard-dot--${item.tone}`} />
                <span>{item.title}:</span>
                <span className="dashboard-legendValue">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-row dashboard-row--lists" aria-label="Activity and alerts">
        <div className="dashboard-panel">
          <div className="dashboard-panelHeader">
            <div className="dashboard-panelTitle">Recent Activity</div>
          </div>

          <div className="dashboard-activityList">
            {displayActivity.map((a) => (
              <div key={a.id} className="dashboard-activityItem">
                <div className={`dashboard-activityIcon dashboard-activityIcon--${a.tone}`} aria-hidden="true">
                  {a.type === 'ENTRY' ? (
                    <EntryActivityIcon className="dashboard-activityIconSvg" aria-hidden="true" focusable="false" />
                  ) : (
                    <ExitActivityIcon className="dashboard-activityIconSvg" aria-hidden="true" focusable="false" />
                  )}
                </div>
                <div className="dashboard-activityBody">
                  <div className="dashboard-activityTop">
                    <span className={`dashboard-pill dashboard-pill--${a.tone}`}>{a.type}</span>
                    <span className="dashboard-activityPlate">{a.plate}</span>
                    {a.vehicleType && <span className="dashboard-activityVehicleType">• {a.vehicleType}</span>}
                    {a.hasSubscription && <span className="dashboard-activitySubscription">Subscription</span>}
                  </div>
                  <div className="dashboard-activityMeta">{a.meta}</div>
                </div>
                {a.amount ? <div className="dashboard-activityAmount">{a.amount}</div> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panelHeader">
            <div className="dashboard-panelTitle">Active Alerts</div>
          </div>

          <div className="dashboard-alertList">
            {displayAlerts.map((al) => (
              <div key={al.id} className={`dashboard-alert dashboard-alert--${al.tone}`}>
                <div className="dashboard-alertIcon" aria-hidden="true">
                  {al.tone === 'warning' ? (
                    <AlertWarningIcon className="dashboard-alertIconSvg" aria-hidden="true" focusable="false" />
                  ) : al.tone === 'danger' ? (
                    <AlertDangerIcon className="dashboard-alertIconSvg" aria-hidden="true" focusable="false" />
                  ) : (
                    <AlertInfoIcon className="dashboard-alertIconSvg" aria-hidden="true" focusable="false" />
                  )}
                </div>
                <div className="dashboard-alertBody">
                  <div className="dashboard-alertTitle">{al.title}</div>
                  <div className="dashboard-alertTime">{al.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-panel" aria-label="Parking capacity overview">
        <div className="dashboard-panelHeader">
          <div className="dashboard-panelTitle">Parking Capacity Overview</div>
        </div>
        <div className="dashboard-capacityGrid">
          {displayCapacity.map((c) => (
            <div key={c.id} className={`dashboard-capacityCard dashboard-capacityCard--${c.tone}`}>
              <div className="dashboard-capacityTop">
                <div className="dashboard-capacityTitle">
                  <span className="dashboard-capacityIcon" aria-hidden="true">
                    {c.id === 'cars' || c.title === 'Ô tô' ? (
                      <CapacityCarsIcon className="dashboard-capacityIconSvg" aria-hidden="true" focusable="false" />
                    ) : c.id === 'motorcycles' || c.title === 'Xe máy' ? (
                      <CapacityMotorcyclesIcon className="dashboard-capacityIconSvg" aria-hidden="true" focusable="false" />
                    ) : c.id === 'trucks' || c.title === 'Xe tải' ? (
                      <CapacityTrucksIcon className="dashboard-capacityIconSvg" aria-hidden="true" focusable="false" />
                    ) : (
                      <CapacityVansIcon className="dashboard-capacityIconSvg" aria-hidden="true" focusable="false" />
                    )}
                  </span>
                  <span>{c.title}</span>
                </div>
                <div className="dashboard-capacityPercent">{c.percentLabel}</div>
              </div>
              <div className={`dashboard-capacityValue dashboard-capacityValue--${c.tone}`}>{c.value}</div>
              <div className={`dashboard-progress dashboard-progress--${c.tone}`}>
                <div className="dashboard-progressBar" style={{ width: `${c.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
