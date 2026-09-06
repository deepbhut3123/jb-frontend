import { useEffect, useMemo, useState } from "react";
import { Select } from "antd";
import { createRoot } from "react-dom/client";
import { api } from "../../../services/api.js";
import { formatDisplayDate } from "../CrmUtils.jsx";
import { navigate } from "../../../utils/navigation.js";

function DashboardOverview({ leads = [], session }) {
  const [dashboardLeads, setDashboardLeads] = useState(leads);
  useEffect(() => {
    api
      .leads(session.token)
      .then((response) => setDashboardLeads(response.leads || []))
      .catch(() => setDashboardLeads([]));
  }, [session.token]);
  leads = dashboardLeads;
  const [range, setRange] = useState("all");
  const filteredLeads = useMemo(() => {
    if (range === "all") return leads;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    return leads.filter((lead) => new Date(lead.createdAt) >= cutoff);
  }, [leads, range]);
  const statusCounts = ["New", "Quotation", "Followup", "Performa-Invoice", "Done", "Lost"].map(
    (status) => ({
      status,
      count: filteredLeads.filter((lead) => lead.status === status).length,
    }),
  );
  const sourceCounts = [
    ...new Set(filteredLeads.map((lead) => lead.source || "Other")),
  ]
    .map((source) => ({
      source,
      count: filteredLeads.filter((lead) => (lead.source || "Other") === source)
        .length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxStatus = Math.max(...statusCounts.map((item) => item.count), 1);
  const maxSource = Math.max(...sourceCounts.map((item) => item.count), 1);
  const followUps = filteredLeads.filter(
    (lead) => lead.nextFollowUp || lead.followUps?.length,
  ).length;
  const conversion = filteredLeads.length
    ? Math.round(
        (filteredLeads.filter((lead) => lead.status === "Done").length /
          filteredLeads.length) *
          100,
      )
    : 0;
  useEffect(() => {
    const select = document.querySelector(".range-filter select");
    if (!select) return undefined;
    select.dataset.customized = "true";
    select.style.display = "none";
    const wrapper = document.createElement("div");
    wrapper.className = "range-custom-dropdown";
    const button = document.createElement("button");
    button.className = "range-custom-button";
    button.type = "button";
    button.innerHTML = `<span>${select.options[select.selectedIndex].text}</span><span class="range-custom-chevron">v</span>`;
    const menu = document.createElement("div");
    menu.className = "range-custom-options";
    [...select.options].forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = option.value === select.value ? "selected" : "";
      item.textContent = option.textContent;
      item.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        button.querySelector("span").textContent = option.textContent;
        menu
          .querySelectorAll("button")
          .forEach((entry) => entry.classList.remove("selected"));
        item.classList.add("selected");
        wrapper.classList.remove("open");
      });
      menu.append(item);
    });
    button.addEventListener("click", () => wrapper.classList.toggle("open"));
    wrapper.append(button, menu);
    select.parentElement.append(wrapper);
    const close = (event) => {
      if (!wrapper.contains(event.target)) wrapper.classList.remove("open");
    };
    document.addEventListener("mousedown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      wrapper.remove();
    };
  }, []);
  useEffect(() => {
    const mount = document.querySelector(".range-custom-dropdown");
    if (!mount) return undefined;
    const root = createRoot(mount);
    root.render(
      <Select
        className="antd-range-select"
        showSearch
        optionFilterProp="label"
        value={range}
        onChange={setRange}
        options={[
          { value: "all", label: "All time" },
          { value: "30", label: "Last 30 days" },
          { value: "7", label: "Last 7 days" },
        ]}
      />,
    );
    return () => root.unmount();
  }, [range]);

  return (
    <div className="crm-content-inner analytics-dashboard">
      <div className="analytics-heading">
        <div>
          <span className="dashboard-kicker">Performance overview</span>
          <h1>Good to see you, {session.user.name.split(" ")[0]}.</h1>
          <p>Monitor your pipeline health and team activity from one place.</p>
        </div>
        <label className="range-filter">
          <span>Period</span>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option value="all">All time</option>
            <option value="30">Last 30 days</option>
            <option value="7">Last 7 days</option>
          </select>
        </label>
      </div>
      <div className="analytics-kpis">
        <article>
          <span>Total leads</span>
          <strong>{filteredLeads.length}</strong>
          <small>Visible in your workspace</small>
        </article>
        <article>
          <span>Open pipeline</span>
          <strong>
            {
              filteredLeads.filter(
                (lead) => !["Done", "Lost"].includes(lead.status),
              ).length
            }
          </strong>
          <small>New, contacted, or qualified</small>
        </article>
        <article>
          <span>Follow-ups</span>
          <strong>{followUps}</strong>
          <small>Leads with activity scheduled</small>
        </article>
        <article>
          <span>Win rate</span>
          <strong>{conversion}%</strong>
          <small>Moved to done</small>
        </article>
      </div>
      <div className="analytics-grid">
        <section className="analytics-card status-chart">
          <div className="analytics-card-heading">
            <div>
              <span className="dashboard-kicker">Pipeline</span>
              <h2>Lead stage</h2>
            </div>
            <span className="chart-total">{filteredLeads.length} total</span>
          </div>
          <div className="bar-chart">
            {statusCounts.map((item) => (
              <div className="bar-row" key={item.status}>
                <span>{item.status}</span>
                <div className="bar-track">
                  <i style={{ width: `${(item.count / maxStatus) * 100}%` }} />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="analytics-card source-chart">
          <div className="analytics-card-heading">
            <div>
              <span className="dashboard-kicker">Acquisition</span>
              <h2>Lead sources</h2>
            </div>
            <span className="chart-total">Top sources</span>
          </div>
          {sourceCounts.length ? (
            <div className="source-list">
              {sourceCounts.map((item) => (
                <div className="source-row" key={item.source}>
                  <div>
                    <span>{item.source}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="source-track">
                    <i
                      style={{ width: `${(item.count / maxSource) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="analytics-empty">No lead data for this period.</p>
          )}
        </section>
      </div>
      <section className="analytics-card activity-card">
        <div className="analytics-card-heading">
          <div>
            <span className="dashboard-kicker">Recent activity</span>
            <h2>Latest leads</h2>
          </div>
          <button
            className="text-action"
            type="button"
            onClick={() => navigate("/leads")}
          >
            View all leads
          </button>
        </div>
        {filteredLeads.length ? (
          <div className="activity-list">
            {filteredLeads.slice(0, 5).map((lead) => (
              <div className="activity-row" key={lead._id}>
                <div className="activity-status" />
                <div>
                  <strong>{lead.name}</strong>
                  <span>
                    {lead.city || lead.company || "No city"} - {lead.status}
                  </span>
                </div>
                <time>{formatDisplayDate(lead.createdAt)}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="analytics-empty">
            Create your first lead to see activity here.
          </p>
        )}
      </section>
    </div>
  );
}

export default DashboardOverview;
