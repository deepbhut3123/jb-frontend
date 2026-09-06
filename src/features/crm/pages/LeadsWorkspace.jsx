import { useEffect, useRef, useState } from "react";
import { DatePicker, Select } from "antd";
import dayjs from "dayjs";
import { createRoot } from "react-dom/client";
import { toast } from "react-toastify";
import { Edit3, Mic, MicOff, Plus, Search, Trash2, X } from "lucide-react";
import indiaLocations from "../../../data/indiaLocations.json";
import { api } from "../../../services/api.js";
import { AntDatePicker, AssigneeDropdown, LeadDropdown, PhoneLink } from "../CrmControls.jsx";
import { formatDisplayDate } from "../CrmUtils.jsx";

function cleanupLeadTableEnhancements() {
  window.dispatchEvent(new Event("jb:lead-table-update-start"));
  document
    .querySelectorAll(".table-select-cell, .table-lead-date-cell")
    .forEach((cell) => cell.remove());
  document
    .querySelectorAll(".table-select-heading, .table-lead-date-heading")
    .forEach((cell) => cell.remove());
}

function finishLeadTableEnhancements(leads) {
  requestAnimationFrame(() =>
    window.dispatchEvent(
      new CustomEvent("jb:lead-table-update-end", { detail: { leads } }),
    ),
  );
}

function LeadOptionManager({ type, label, options, token, onClose, onChanged }) {
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(null);
  async function saveOption(event) {
    event.preventDefault();
    if (!value.trim()) return;
    try {
      const result = editing
        ? await api.updateLeadOption(token, editing._id, { value })
        : await api.createLeadOption(token, { type, value });
      onChanged(editing ? options.map((item) => item._id === result.option._id ? result.option : item) : [...options, result.option]);
      setValue(""); setEditing(null); toast.success(editing ? "Dropdown value updated." : "Dropdown value added.");
    } catch (error) { toast.error(error.message); }
  }
  async function removeOption(option) {
    try {
      await api.deleteLeadOption(token, option._id);
      onChanged(options.filter((item) => item._id !== option._id));
      toast.success("Dropdown value deleted.");
    } catch (error) { toast.error(error.message); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="confirm-modal lead-option-modal"><div className="modal-heading"><div><span className="dashboard-kicker">Lead configuration</span><h2>{label} values</h2></div><button className="modal-close" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div><form className="lead-option-form" onSubmit={saveOption}><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={`Add ${label.toLowerCase()}`} /><button className="primary-action" type="submit">{editing ? "Save" : "Add"}</button>{editing && <button className="secondary-action" type="button" onClick={() => { setEditing(null); setValue(""); }}>Cancel</button>}</form><div className="lead-option-list">{options.map((option) => <div className="lead-option-row" key={option._id}><span>{option.value}</span><button className="lead-option-icon edit" type="button" title={`Edit ${option.value}`} aria-label={`Edit ${option.value}`} onClick={() => { setEditing(option); setValue(option.value); }}><Edit3 size={15} /></button><button className="lead-option-icon delete" type="button" title={`Delete ${option.value}`} aria-label={`Delete ${option.value}`} onClick={() => removeOption(option)}><Trash2 size={15} /></button></div>)}</div></div></div>;
}

function LeadsPanel({ leads, setLeads, isAdmin, users, token, currentUser, leadOptions, setLeadOptions }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [dialog, setDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [optionDialog, setOptionDialog] = useState(null);
  const [followUpDialog, setFollowUpDialog] = useState(null);
  const [isVoiceTyping, setIsVoiceTyping] = useState(false);
  const speechRecognitionRef = useRef(null);
  const voiceBaseDescriptionRef = useRef("");
  const [followUpForm, setFollowUpForm] = useState({
    date: "",
    description: "",
    nextDate: "",
  });
  const [sendingFollowUp, setSendingFollowUp] = useState(null);
  const [form, setForm] = useState({
    name: "",
    company: "",
    address1: "",
    address2: "",
    area: "",
    city: "",
    state: "",
    email: "",
    website: "",
    phone: "",
    customerType: "",
    segment: "",
    companyPersons: [{ name: "", email: "", contactNumber: "", designation: "", department: "" }],
    leadSource: "",
    assignedTo: "",
    stage: "New",
    nextFollowUp: "",
  });
  const filteredLeads = leads;
  const assignableUsers = isAdmin
    ? users
    : [{ _id: currentUser.id, name: currentUser.name, roleLabel: "User" }];
  function optionsFor(type) {
    const saved = leadOptions.filter((option) => option.type === type).map((option) => option.value);
    return saved;
  }
  function updateOptionList(nextOptions) {
    setLeadOptions((current) => [...current.filter((option) => option.type !== optionDialog), ...nextOptions]);
  }
  function updateCompanyPerson(index, changes) {
    setForm((current) => ({ ...current, companyPersons: current.companyPersons.map((person, personIndex) => personIndex === index ? { ...person, ...changes } : person) }));
  }
  useEffect(() => {
    const params = { page, limit: 10, status: status === "All" ? undefined : status, search: search.trim() };
    if (dateRange !== "all") {
      const end = dayjs().add(1, "day");
      params.dateTo = end.format("YYYY-MM-DD");
      params.dateFrom = (dateRange === "today" ? dayjs() : dayjs().subtract(Number(dateRange) - 1, "day")).format("YYYY-MM-DD");
    }
    let active = true;
    api.leads(token, params)
      .then((response) => {
        if (!active) return;
        setLeads(response.leads);
        setPagination(response.pagination || { page, limit: 10, total: response.leads.length, totalPages: 1 });
      })
      .catch((error) => active && toast.error(error.message));
    return () => { active = false; };
  }, [dateRange, page, search, setLeads, status, token]);
  function commitLeads(nextLeads) {
    cleanupLeadTableEnhancements();
    setLeads([...nextLeads]);
    finishLeadTableEnhancements(nextLeads);
  }
  useEffect(() => {
    function refreshLeads(event) {
      const nextLeads = event.detail?.leads;
      if (!Array.isArray(nextLeads)) return;
      cleanupLeadTableEnhancements();
      setLeads([...nextLeads]);
      finishLeadTableEnhancements(nextLeads);
    }
    window.addEventListener("jb:leads-refreshed", refreshLeads);
    return () => window.removeEventListener("jb:leads-refreshed", refreshLeads);
  }, [setLeads]);
  const initialLeadDate = form.nextFollowUp;
  useEffect(() => {
    if (!dialog || !["create", "edit"].includes(dialog.mode)) return undefined;
    const fields = document.querySelector(".lead-modal .modal-fields");
    if (!fields || fields.querySelector(".lead-date-field")) return undefined;
    const label = document.createElement("div");
    label.className = "lead-date-field";
    label.textContent = "Next follow-up date (optional)";
    const mount = document.createElement("div");
    label.append(mount);
    fields.insertBefore(label, fields.lastElementChild);
    const root = createRoot(mount);
    root.render(
      <AntDatePicker
        value={initialLeadDate}
        onChange={(nextFollowUp) =>
          setForm((current) => ({ ...current, nextFollowUp }))
        }
      />,
    );
    return () => {
      root.unmount();
      label.remove();
    };
  }, [dialog, initialLeadDate]);
  useEffect(() => {
    if (!followUpDialog || followUpDialog.mode === "delete") return undefined;
    const mount = document.querySelector(".followup-form-modal .date-picker");
    if (!mount) return undefined;
    const nativeInput = mount.querySelector('input[type="date"]');
    if (nativeInput) nativeInput.style.display = "none";
    const host = document.createElement("span");
    host.className = "antd-date-mount";
    mount.append(host);
    const fieldLabel = mount.closest("label");
    function preventLabelDateOpen(event) {
      if (fieldLabel && !host.contains(event.target)) event.preventDefault();
    }
    fieldLabel?.addEventListener("click", preventLabelDateOpen, true);
    const root = createRoot(host);
    root.render(
      <AntDatePicker
        value={followUpForm.date}
        onChange={(date) =>
          setFollowUpForm((current) => ({ ...current, date }))
        }
        required
      />,
    );
    const fields = mount.closest(".modal-fields");
    const nextDateField = document.createElement("div");
    nextDateField.className = "followup-next-date-field";
    const nextDateLabel = document.createElement("span");
    nextDateLabel.textContent = "Next follow-up date";
    const nextDateHost = document.createElement("span");
    nextDateHost.className = "antd-date-mount";
    const nextDateHint = document.createElement("small");
    nextDateHint.textContent = "Choose the date for the next planned action.";
    nextDateField.append(nextDateLabel, nextDateHost, nextDateHint);
    fields?.insertBefore(nextDateField, fields.querySelector(".full-field"));
    const nextDateRoot = createRoot(nextDateHost);
    nextDateRoot.render(
      <AntDatePicker
        value={followUpForm.nextDate}
        onChange={(nextDate) =>
          setFollowUpForm((current) => ({ ...current, nextDate }))
        }
      />,
    );
    return () => {
      fieldLabel?.removeEventListener("click", preventLabelDateOpen, true);
      root.unmount();
      nextDateRoot.unmount();
      host.remove();
      nextDateField.remove();
      if (nativeInput) nativeInput.style.display = "";
    };
  }, [followUpDialog, followUpForm.date, followUpForm.nextDate]);
  useEffect(
    () => () => {
      speechRecognitionRef.current?.abort();
    },
    [],
  );

  function stopVoiceTyping() {
    const recognition = speechRecognitionRef.current;
    if (recognition) recognition.stop();
  }

  function closeFollowUpEditor() {
    speechRecognitionRef.current?.abort();
    setFollowUpDialog(null);
  }

  function toggleVoiceTyping() {
    if (isVoiceTyping) {
      stopVoiceTyping();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(
        "Voice typing is not supported in this browser. Please use Chrome or Edge.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-IN";
    voiceBaseDescriptionRef.current = followUpForm.description.trim();
    speechRecognitionRef.current = recognition;

    recognition.onstart = () => setIsVoiceTyping(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const base = voiceBaseDescriptionRef.current;
      setFollowUpForm((current) => ({
        ...current,
        description: [base, transcript].filter(Boolean).join(" "),
      }));
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      const message =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone permission is required for voice typing."
          : event.error === "no-speech"
            ? "No speech was detected. Please try again."
            : "Voice typing stopped unexpectedly. Please try again.";
      toast.error(message);
    };
    recognition.onend = () => {
      speechRecognitionRef.current = null;
      setIsVoiceTyping(false);
    };

    try {
      recognition.start();
    } catch {
      speechRecognitionRef.current = null;
      setIsVoiceTyping(false);
      toast.error("Unable to start voice typing. Please try again.");
    }
  }

  function openCreate() {
    setForm({
      name: "",
      company: "",
      address1: "", address2: "", area: "", city: "", state: "",
      email: "",
      website: "",
      phone: "",
      customerType: "", segment: "", companyPersons: [{ name: "", email: "", contactNumber: "", designation: "", department: "" }], leadSource: "",
      assignedTo: currentUser.id,
      stage: "New",
      nextFollowUp: "",
    });
    setDialog({ mode: "create" });
  }
  function openEdit(lead) {
    setForm({
      name: lead.name,
      company: lead.company === "N/A" ? "" : lead.company,
      address1: lead.address1 || "", address2: lead.address2 || "", area: lead.area || "", city: lead.city || "", state: lead.state || "",
      email: lead.email,
      website: lead.website || "",
      phone: lead.phone,
      customerType: lead.customerType || "", segment: lead.segment || "", companyPersons: lead.companyPersons?.length ? lead.companyPersons : [{ name: "", email: "", contactNumber: "", designation: "", department: "" }], leadSource: lead.leadSource || lead.source || "",
      assignedTo: lead.assignedTo,
      stage: lead.stage || lead.status || "New",
      nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.slice(0, 10) : "",
    });
    setDialog({ mode: "edit", lead });
  }
  async function updateInline(lead, changes) {
    try {
      const result = await api.updateLead(token, lead._id, {
        name: lead.name,
        company: lead.company === "N/A" ? "" : lead.company,
        address1: lead.address1 || "", address2: lead.address2 || "", area: lead.area || "", city: lead.city || "", state: lead.state || "",
        email: lead.email,
        website: lead.website || "",
        phone: lead.phone,
        contactNumber: lead.phone,
        customerType: lead.customerType || "Individual", segment: lead.segment || "SMB", companyPersons: lead.companyPersons || [],
        assignedTo: lead.assignedTo,
        leadSource: lead.leadSource || lead.source,
        stage: lead.stage || lead.status,
        nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.slice(0, 10) : "",
        ...changes,
      });
      commitLeads(
        leads.map((item) =>
          item._id === result.lead._id ? result.lead : item,
        ),
      );
      setStatus("All");
      toast.success("Lead updated.");
    } catch (error) {
      toast.error(error.message);
    }
  }
  async function submitLead(event) {
    event.preventDefault();
    try {
      const mode = dialog.mode;
      const result =
        mode === "create"
          ? await api.createLead(token, form)
          : await api.updateLead(token, dialog.lead._id, form);
      commitLeads(
        mode === "create"
          ? [result.lead, ...leads]
          : leads.map((lead) =>
              lead._id === result.lead._id ? result.lead : lead,
            ),
      );
      setStatus("All");
      setSearch("");
      setDialog(null);
      toast.success(
        mode === "create"
          ? "Lead added successfully."
          : "Lead updated successfully.",
      );
    } catch (error) {
      toast.error(error.message);
    }
  }
  async function deleteLead(lead) {
    setDeleteDialog(lead);
  }
  async function confirmDeleteLead() {
    try {
      await api.deleteLead(token, deleteDialog._id);
      commitLeads(leads.filter((item) => item._id !== deleteDialog._id));
      setDeleteDialog(null);
      toast.success("Lead deleted successfully.");
    } catch (error) {
      toast.error(error.message);
    }
  }
  function openFollowupCreate(lead) {
    stopVoiceTyping();
    setFollowUpForm({
      date: dayjs().format("YYYY-MM-DD"),
      description: "",
      nextDate: "",
    });
    setFollowUpDialog({ mode: "create", lead });
  }
  function openFollowupEdit(lead, item) {
    stopVoiceTyping();
    setFollowUpForm({
      date: item.date ? item.date.slice(0, 10) : dayjs().format("YYYY-MM-DD"),
      description: item.description || "",
      nextDate: item.nextDate ? item.nextDate.slice(0, 10) : "",
    });
    setFollowUpDialog({ mode: "edit", lead, item });
  }
  async function submitFollowup(event) {
    event.preventDefault();
    stopVoiceTyping();
    try {
      const mode = followUpDialog.mode;
      const result =
        mode === "create"
          ? await api.createFollowUp(
              token,
              followUpDialog.lead._id,
              followUpForm,
            )
          : await api.updateFollowUp(
              token,
              followUpDialog.lead._id,
              followUpDialog.item._id,
              followUpForm,
            );
      commitLeads(
        leads.map((lead) =>
          lead._id === result.lead._id ? result.lead : lead,
        ),
      );
      setDialog({ mode: "followups", lead: result.lead });
      setFollowUpDialog(null);
      toast.success(
        mode === "create" ? "Follow-up added." : "Follow-up updated.",
      );
    } catch (error) {
      toast.error(error.message);
    }
  }
  async function deleteFollowup() {
    try {
      const result = await api.deleteFollowUp(
        token,
        followUpDialog.lead._id,
        followUpDialog.item._id,
      );
      commitLeads(
        leads.map((lead) =>
          lead._id === result.lead._id ? result.lead : lead,
        ),
      );
      setDialog({ mode: "followups", lead: result.lead });
      setFollowUpDialog(null);
      toast.success("Follow-up deleted.");
    } catch (error) {
      toast.error(error.message);
    }
  }
  const details = dialog?.mode === "details" ? dialog.lead : null;
  const followUps = dialog?.lead?.followUps || [];
  async function sendFollowUpOnWhatsApp(lead, item) {
    if (!item._id || sendingFollowUp) return;
    setSendingFollowUp(item._id);
    try {
      await api.sendFollowUpWhatsApp(token, lead._id, item._id, item.description);
      toast.success("Follow-up message sent on WhatsApp.");
    } catch (error) { toast.error(error.message); }
    finally { setSendingFollowUp(null); }
  }
  return (
    <div className="crm-content-inner leads-page">
      <div className="section-heading">
        <div>
          <h1>Leads</h1>
          <p>Click a lead name to view its complete details.</p>
        </div>
        <button className="primary-action" type="button" onClick={openCreate}>
          <Plus size={17} />
          Add lead
        </button>
      </div>
      <div className="lead-toolbar">
        <div className="lead-status-tabs">
          {["All", "New", "Quotation", "Followup", "Performa-Invoice", "Done", "Lost"].map(
            (item) => (
              <button
                className={status === item ? "active" : ""}
                type="button"
                key={item}
                onClick={() => {
                  setStatus(item);
                  setPage(1);
                }}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <label className="user-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search leads"
          />
        </label>
        <label className="lead-date-filter">
          <span>Date</span>
          <Select
            className="antd-crm-select lead-date-select"
            value={dateRange}
            showSearch
            optionFilterProp="label"
            onChange={(value) => {
              setDateRange(value);
              setPage(1);
            }}
            options={[{ value: "all", label: "All time" }, { value: "today", label: "Today" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }]}
          />
        </label>
      </div>
      <div className="leads-table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>City</th>
              <th>Contact</th>
              <th>Source</th>
              <th>Stage</th>
              <th>Assigned to</th>
              <th>Follow-up</th>
              <th className="actions-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length ? (
              filteredLeads.map((lead) => (
                <tr
                  key={lead._id}
                  data-lead-id={lead._id}
                  onClick={() => setDialog({ mode: "details", lead })}
                >
                  <td>
                    <button
                      className="lead-name-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDialog({ mode: "details", lead });
                      }}
                    >
                      <span>{(lead.name || "?").slice(0, 1).toUpperCase()}</span>
                      <strong>{lead.name}</strong>
                    </button>
                  </td>
                  <td>{lead.city || "N/A"}</td>
                  <td>
                    <div className="lead-contact">
                      <span>{lead.email || "No email"}</span>
                      <small>
                        <PhoneLink phone={lead.phone} />
                      </small>
                    </div>
                  </td>
                  <td>{lead.leadSource || lead.source || "N/A"}</td>
                  <td>
                    <div onClick={(event) => event.stopPropagation()}>
                      <LeadDropdown
                        value={lead.status}
                        options={["New", "Quotation", "Followup", "Performa-Invoice", "Done", "Lost"]}
                        onChange={(nextStage) =>
                          updateInline(lead, { stage: nextStage, status: nextStage })
                        }
                      />
                    </div>
                  </td>
                  <td>
                    <div onClick={(event) => event.stopPropagation()}>
                      <AssigneeDropdown
                        users={assignableUsers}
                        value={lead.assignedTo}
                        disabled={!isAdmin}
                        onChange={(assignedTo) =>
                          updateInline(lead, { assignedTo })
                        }
                      />
                    </div>
                  </td>
                  <td>
                    <button
                      className="followup-link"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDialog({ mode: "followups", lead });
                      }}
                    >
                      {lead.followUps?.length || 0}{" "}
                      record
                      {lead.followUps?.length === 1
                        ? ""
                        : "s"}
                    </button>
                  </td>
                  <td>
                    <div
                      className="table-actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        className="icon-action edit"
                        type="button"
                        title="Edit lead"
                        onClick={() => openEdit(lead)}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="icon-action delete"
                        type="button"
                        title="Delete lead"
                        onClick={() => deleteLead(lead)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-table" colSpan="8">
                  No leads match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="lead-pagination">
        <span>
          {pagination.total} lead{pagination.total === 1 ? "" : "s"}
        </span>
        <div>
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </button>
          <strong>Page {page} of {pagination.totalPages}</strong>
          <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      </div>
      {dialog && ["create", "edit"].includes(dialog.mode) && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <form className="user-modal lead-modal" onSubmit={submitLead}>
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Lead workspace</span>
                <h2>
                  {dialog.mode === "create"
                    ? "Add a new lead"
                    : "Edit lead details"}
                </h2>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setDialog(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-fields">
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter customer name"
                />
              </label>
              <label>Company name<input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name" /></label>
              <label>
                Address 1
                <input
                  
                  value={form.address1}
                  onChange={(event) =>
                    setForm({ ...form, address1: event.target.value })
                  }
                  placeholder="Address line 1"
                />
              </label>
              <label>Address 2<input value={form.address2} onChange={(event) => setForm({ ...form, address2: event.target.value })} placeholder="Address line 2" /></label>
              <label>Area<input value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} placeholder="Area" /></label>
              <label>State<LeadDropdown value={form.state} options={Object.keys(indiaLocations)} placeholder="Select state" showStatusIndicator={false} onChange={(state) => setForm({ ...form, state, city: "" })} /></label>
              <label>City<LeadDropdown value={form.city} options={form.state ? indiaLocations[form.state] || [] : []} placeholder={form.state ? "Select city" : "Select state first"} showStatusIndicator={false} disabled={!form.state} onChange={(city) => setForm({ ...form, city })} /></label>
              <label>
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="contact@company.com"
                />
              </label>
              <label>
                Website
                <input type="url" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://example.com" />
              </label>
              <label>
                Contact Number
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="Optional"
                />
              </label>
              <label>
                Customer Type
                <LeadDropdown value={form.customerType} options={optionsFor("customerType")} placeholder="Select customer type" onChange={(customerType) => setForm({ ...form, customerType })} showStatusIndicator={false} manageLabel="Manage customer types" onManage={isAdmin ? () => setOptionDialog("customerType") : undefined} />
              </label>
              <label>
                Segment
                <LeadDropdown value={form.segment} options={optionsFor("segment")} placeholder="Select segment" onChange={(segment) => setForm({ ...form, segment })} showStatusIndicator={false} manageLabel="Manage segments" onManage={isAdmin ? () => setOptionDialog("segment") : undefined} />
              </label>
              <div className="full-field company-persons-field">
                <div className="company-persons-heading"><strong>Company Person Detail</strong><button className="secondary-action" type="button" onClick={() => setForm({ ...form, companyPersons: [...form.companyPersons, { name: "", email: "", contactNumber: "", designation: "", department: "" }] })}><Plus size={14} />Add person</button></div>
                {form.companyPersons.map((person, index) => <div className="company-person-row" key={index}><input value={person.name} onChange={(event) => updateCompanyPerson(index, { name: event.target.value })} placeholder="Name" /><input type="email" value={person.email} onChange={(event) => updateCompanyPerson(index, { email: event.target.value })} placeholder="Email" /><input value={person.contactNumber} onChange={(event) => updateCompanyPerson(index, { contactNumber: event.target.value.replace(/\D/g, "") })} placeholder="Contact Number" /><input value={person.designation} onChange={(event) => updateCompanyPerson(index, { designation: event.target.value })} placeholder="Designation" /><input value={person.department} onChange={(event) => updateCompanyPerson(index, { department: event.target.value })} placeholder="Department" />{form.companyPersons.length > 1 && <button className="icon-action delete" type="button" title="Remove person" onClick={() => setForm({ ...form, companyPersons: form.companyPersons.filter((_, personIndex) => personIndex !== index) })}><Trash2 size={15} /></button>}</div>)}
              </div>
              <label>
                Lead Source
                <LeadDropdown value={form.leadSource} options={optionsFor("leadSource")} placeholder="Select lead source" onChange={(leadSource) => setForm({ ...form, leadSource })} showStatusIndicator={false} manageLabel="Manage lead sources" onManage={isAdmin ? () => setOptionDialog("leadSource") : undefined} />
              </label>
              <label>
                Assign to
                <AssigneeDropdown
                  users={assignableUsers}
                  value={form.assignedTo}
                  disabled={!isAdmin}
                  onChange={(assignedTo) => setForm({ ...form, assignedTo })}
                />
                {!isAdmin && (
                  <small className="field-hint">
                    Leads created by you stay assigned to your account.
                  </small>
                )}
              </label>
              <label>
                Stage
                <LeadDropdown
                  value={form.stage}
                  options={["New", "Quotation", "Followup", "Performa-Invoice", "Done", "Lost"]}
                  onChange={(stage) => setForm({ ...form, stage })}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button className="primary-action" type="submit">
                {dialog.mode === "create" ? "Create lead" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleteDialog && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteDialog(null)}>
          <div className="confirm-modal">
            <div className="confirm-icon"><Trash2 size={20} /></div>
            <h2>Delete this lead?</h2>
            <p>This will permanently remove <strong>{deleteDialog.name || "this lead"}</strong> and all its details.</p>
            <div className="modal-footer"><button className="secondary-action" type="button" onClick={() => setDeleteDialog(null)}>Cancel</button><button className="danger-action" type="button" onClick={confirmDeleteLead}>Delete lead</button></div>
          </div>
        </div>
      )}
      {optionDialog && isAdmin && (
        <LeadOptionManager
          type={optionDialog}
          label={optionDialog === "customerType" ? "Customer type" : optionDialog === "leadSource" ? "Lead source" : "Segment"}
          options={leadOptions.filter((option) => option.type === optionDialog)}
          token={token}
          onClose={() => setOptionDialog(null)}
          onChanged={(nextOptions) => {
            updateOptionList(nextOptions);
          }}
        />
      )}
      {dialog?.mode === "details" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <div className="lead-details-modal">
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Lead details</span>
                <h2>{details.name}</h2>
                <p>{details.company || "N/A"}</p>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setDialog(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="lead-detail-grid">
              <div><span>Address 1</span><strong>{details.address1 || "No address"}</strong></div>
              <div><span>Address 2</span><strong>{details.address2 || "Not provided"}</strong></div>
              <div><span>Area</span><strong>{details.area || "Not provided"}</strong></div>
              <div><span>City</span><strong>{details.city || "Not provided"}</strong></div>
              <div><span>State</span><strong>{details.state || "Not provided"}</strong></div>
              <div>
                <span>Email</span>
                <strong>{details.email || "No email"}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>
                  <PhoneLink phone={details.phone} />
                </strong>
              </div>
              <div>
                <span>Customer type</span>
                <strong>{details.customerType || "Not provided"}</strong>
              </div>
              <div>
                <span>Segment</span>
                <strong>{details.segment || "Not provided"}</strong>
              </div>
              <div>
                <span>Website</span>
                <strong>{details.website || "Not provided"}</strong>
              </div>
              <div>
                <span>Lead source</span>
                <strong>{details.leadSource || details.source || "Not provided"}</strong>
              </div>
              <div>
                <span>Stage</span>
                <strong>{details.stage || details.status}</strong>
              </div>
              <div>
                <span>Assigned to</span>
                <strong>{details.assignedName}</strong>
              </div>
            </div>
            <div className="lead-detail-company-persons company-person-details">
              <span>Company person details</span>
              {details.companyPersons?.length ? details.companyPersons.map((person, index) => <div className="company-person-detail" key={index}><strong>{person.name || "Unnamed person"}</strong><small>{person.email || "No email"} - {person.contactNumber || "No contact"} - {person.designation || "No designation"} - {person.department || "No department"}</small></div>) : <p>No company persons added.</p>}
            </div>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setDialog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog?.mode === "followups" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <div className="followup-modal">
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Activity timeline</span>
                <h2>Follow-up history</h2>
                <p>{dialog.lead.name}</p>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setDialog(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="followup-list">
              {followUps.map((item, index) => (
                <article className="followup-item" key={item._id || index}>
                  <span className="followup-dot" />
                  <div>
                    <strong>
                      {item.date ? formatDisplayDate(item.date) : "No date"}
                    </strong>
                    <p>{item.description || "No description"}</p>
                    <small>
                      Next follow-up:{" "}
                      {item.nextDate
                        ? formatDisplayDate(item.nextDate)
                        : "Not scheduled"}
                    </small>
                  </div>
                  <div className="followup-actions">
                    {dialog.lead.whatsappIdentity && <button className="followup-send-whatsapp" type="button" title="Send this follow-up on WhatsApp" aria-label="Send this follow-up on WhatsApp" disabled={Boolean(sendingFollowUp)} onClick={() => sendFollowUpOnWhatsApp(dialog.lead, item)}>{sendingFollowUp === item._id ? "Sending…" : "Send"}</button>}
                    <button
                      className="icon-action edit"
                      type="button"
                      title="Edit follow-up"
                      onClick={() => openFollowupEdit(dialog.lead, item)}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="icon-action delete"
                      type="button"
                      title="Delete follow-up"
                      onClick={() =>
                        setFollowUpDialog({
                          mode: "delete",
                          lead: dialog.lead,
                          item,
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!followUps.length && (
              <p className="followup-empty">
                No follow-up activity has been added yet.
              </p>
            )}
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={() => openFollowupCreate(dialog.lead)}
              >
                <Plus size={15} />
                Add follow-up
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => setDialog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {followUpDialog?.mode !== "delete" && followUpDialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeFollowUpEditor()
          }
        >
          <form
            className="user-modal followup-form-modal"
            onSubmit={submitFollowup}
          >
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Activity update</span>
                <h2>
                  {followUpDialog.mode === "create"
                    ? "Add follow-up"
                    : "Edit follow-up"}
                </h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={closeFollowUpEditor}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-fields">
              <label>
                Activity date
                <div className="date-picker">
                  <input
                    required
                    type="date"
                    value={followUpForm.date}
                    onChange={(event) =>
                      setFollowUpForm({
                        ...followUpForm,
                        date: event.target.value,
                      })
                    }
                  />
                </div>
              </label>
              <label className="full-field">
                <span className="followup-description-heading">
                  <span>Description</span>
                  <button
                    className={`voice-typing-button${isVoiceTyping ? " active" : ""}`}
                    type="button"
                    aria-pressed={isVoiceTyping}
                    onClick={toggleVoiceTyping}
                  >
                    {isVoiceTyping ? <MicOff size={15} /> : <Mic size={15} />}
                    {isVoiceTyping ? "Stop voice" : "Voice type"}
                  </button>
                </span>
                <textarea
                  required
                  value={followUpForm.description}
                  onChange={(event) =>
                    setFollowUpForm({
                      ...followUpForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Describe the call, meeting, or next action"
                  rows="4"
                />
                <small className={`voice-typing-hint${isVoiceTyping ? " active" : ""}`}>
                  {isVoiceTyping
                    ? "Listening... Speak clearly; your words will appear here."
                    : "Use your microphone to dictate the follow-up description."}
                </small>
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={closeFollowUpEditor}
              >
                Cancel
              </button>
              <button className="primary-action" type="submit">
                Save follow-up
              </button>
            </div>
          </form>
        </div>
      )}
      {followUpDialog?.mode === "delete" && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setFollowUpDialog(null)
          }
        >
          <div className="confirm-modal">
            <div className="confirm-icon">
              <Trash2 size={20} />
            </div>
            <h2>Delete follow-up?</h2>
            <p>This activity will be permanently removed.</p>
            <div className="modal-footer">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setFollowUpDialog(null)}
              >
                Cancel
              </button>
              <button
                className="danger-action"
                type="button"
                onClick={deleteFollowup}
              >
                Delete follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadsPanel;
