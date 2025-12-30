import '../styles/pages/Dashboard.css';

import CashIcon from '../assets/icons/dashboard/cash.svg?react';
import CarIcon from '../assets/icons/dashboard/car.svg?react';
import UsersIcon from '../assets/icons/dashboard/users.svg?react';
import PulseIcon from '../assets/icons/dashboard/pulse.svg?react';
import ArrowUpIcon from '../assets/icons/dashboard/arrow-up.svg?react';

export default function Dashboard() {
  const stats = [
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

  const recentActivity = [
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

  const alerts = [
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

  const capacity = [
    {
      id: 'cars',
      title: 'Cars',
      value: '245 / 500',
      percentLabel: '49% Full',
      percent: 49,
      tone: 'blue',
    },
    {
      id: 'motorcycles',
      title: 'Motorcycles',
      value: '389 / 1200',
      percentLabel: '32% Full',
      percent: 32,
      tone: 'purple',
    },
    {
      id: 'trucks',
      title: 'Trucks',
      value: '87 / 150',
      percentLabel: '58% Full',
      percent: 58,
      tone: 'orange',
    },
    {
      id: 'vans',
      title: 'Vans',
      value: '132 / 200',
      percentLabel: '66% Full',
      percent: 66,
      tone: 'green',
    },
  ];

  return (
      <div className="dashboard">
        <section className="dashboard-stats" aria-label="Key statistics">
          {stats.map((s) => (
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
            <div className="dashboard-chartPlaceholder" role="img" aria-label="Revenue trend chart (placeholder)" />
            <div className="dashboard-chartHint">(Chart placeholder — wire real data later)</div>
          </div>

          <div className="dashboard-panel">
            <div className="dashboard-panelHeader">
              <div className="dashboard-panelTitle">Vehicle Distribution</div>
            </div>
            <div className="dashboard-donutPlaceholder" role="img" aria-label="Vehicle distribution donut chart (placeholder)" />
            <div className="dashboard-legend">
              <div className="dashboard-legendItem">
                <span className="dashboard-dot dashboard-dot--blue" />
                <span>Cars:</span>
                <span className="dashboard-legendValue">245</span>
              </div>
              <div className="dashboard-legendItem">
                <span className="dashboard-dot dashboard-dot--purple" />
                <span>Motorcycles:</span>
                <span className="dashboard-legendValue">389</span>
              </div>
              <div className="dashboard-legendItem">
                <span className="dashboard-dot dashboard-dot--orange" />
                <span>Trucks:</span>
                <span className="dashboard-legendValue">87</span>
              </div>
              <div className="dashboard-legendItem">
                <span className="dashboard-dot dashboard-dot--green" />
                <span>Vans:</span>
                <span className="dashboard-legendValue">132</span>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-row dashboard-row--lists" aria-label="Activity and alerts">
          <div className="dashboard-panel">
            <div className="dashboard-panelHeader">
              <div className="dashboard-panelTitle">Recent Activity</div>
            </div>

            <div className="dashboard-activityList">
              {recentActivity.map((a) => (
                <div key={a.id} className="dashboard-activityItem">
                  <div className={`dashboard-activityIcon dashboard-activityIcon--${a.tone}`} aria-hidden="true" />
                  <div className="dashboard-activityBody">
                    <div className="dashboard-activityTop">
                      <span className={`dashboard-pill dashboard-pill--${a.tone}`}>{a.type}</span>
                      <span className="dashboard-activityPlate">{a.plate}</span>
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
              {alerts.map((al) => (
                <div key={al.id} className={`dashboard-alert dashboard-alert--${al.tone}`}>
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
            {capacity.map((c) => (
              <div key={c.id} className={`dashboard-capacityCard dashboard-capacityCard--${c.tone}`}>
                <div className="dashboard-capacityTop">
                  <div className="dashboard-capacityTitle">{c.title}</div>
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
