import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const metrics = [
  { label: 'Active Orders', value: '128', trend: '+18%' },
  { label: 'Inventory Items', value: '2,460', trend: '94% ready' },
  { label: 'Monthly Revenue', value: '₹8.4L', trend: '+12.5%' },
];

const tasks = [
  'Review pending purchase requests',
  'Confirm today delivery schedule',
  'Update low-stock product quantities',
];

function App() {
  const [apiStatus, setApiStatus] = useState({
    message: 'Checking backend...',
    database: 'checking',
  });

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((response) => response.json())
      .then((data) =>
        setApiStatus({
          message: data.message,
          database: data.database || 'unknown',
        }),
      )
      .catch(() =>
        setApiStatus({
          message: 'Backend is not reachable yet.',
          database: 'offline',
        }),
      );
  }, []);

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div className="brand-mark">JB</div>
        <div>
          <strong>JB Corporations</strong>
          <span>Operations Console</span>
        </div>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Business Management</p>
          <h1>Track orders, stock, and growth from one clean dashboard.</h1>
          <p className="summary">
            Your React frontend is running and ready for real modules like
            products, customers, invoices, reports, and admin controls.
          </p>

          <div className="status-row">
            <div className="status-pill">
              <span className="pulse" />
              <div>
                <small>API</small>
                <strong>{apiStatus.message}</strong>
              </div>
            </div>
            <div className="status-pill">
              <span className="pulse database" />
              <div>
                <small>Database</small>
                <strong>{apiStatus.database}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-preview" aria-label="Dashboard preview">
          <div className="preview-header">
            <div>
              <span>Today</span>
              <strong>Company Snapshot</strong>
            </div>
            <button type="button">View Report</button>
          </div>

          <div className="metric-grid">
            {metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.trend}</small>
              </article>
            ))}
          </div>

          <div className="workflow-panel">
            <div>
              <span>Priority Queue</span>
              <strong>3 actions need attention</strong>
            </div>
            <ul>
              {tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
