import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { CalendarClock, Download, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api, getSession } from '../services/api.js';

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function formatExportDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return [String(date.getDate()).padStart(2, '0'), String(date.getMonth() + 1).padStart(2, '0'), date.getFullYear()].join('/');
}

function ExportLeadsButton() {
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState({ date: '', nextDate: '', description: '' });
  const selectedLeadIdsRef = useRef([]);
  const leadCache = useRef([]);
  const pausedRef = useRef(false);

  function updateSelection(updater) {
    setSelectedLeadIds((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      selectedLeadIdsRef.current = next;
      return next;
    });
  }

  useEffect(() => {
    function attachCheckboxes() {
      if (pausedRef.current) return;
      const table = document.querySelector('.leads-table');
      if (!table) return;
      const header = table.querySelector('thead tr');
      if (header && !header.querySelector('.table-select-heading')) {
        const cell = document.createElement('th');
        cell.className = 'table-select-heading';
        header.prepend(cell);
      }
      if (header && !header.querySelector('.table-lead-date-heading')) {
        const cell = document.createElement('th');
        cell.className = 'table-lead-date-heading';
        cell.textContent = 'Lead date';
        header.insertBefore(cell, header.children[4] || null);
      }
      table.querySelectorAll('tbody tr').forEach((row) => {
        const leadId = row.dataset.leadId;
        const firstCell = row.querySelector('td');
        if (!firstCell || !leadId) return;
        if (firstCell.querySelector('.table-lead-checkbox')) {
          firstCell.querySelector('.table-lead-checkbox').checked = selectedLeadIdsRef.current.includes(leadId);
          const lead = leadCache.current.find((item) => item._id === leadId);
          if (lead && !row.querySelector('.table-lead-date-cell')) {
            const dateCell = document.createElement('td');
            dateCell.className = 'table-lead-date-cell';
            dateCell.textContent = formatExportDate(lead.nextFollowUp || lead.createdAt);
            row.insertBefore(dateCell, row.children[4] || null);
          }
          return;
        }
        const cell = document.createElement('td');
        cell.className = 'table-select-cell';
        const checkbox = document.createElement('input');
        checkbox.className = 'table-lead-checkbox';
        checkbox.type = 'checkbox';
        checkbox.title = 'Select lead';
        checkbox.checked = selectedLeadIdsRef.current.includes(leadId);
        checkbox.addEventListener('click', (event) => event.stopPropagation());
        checkbox.addEventListener('change', (event) => {
          updateSelection((current) => event.target.checked
            ? [...new Set([...current, leadId])]
            : current.filter((item) => item !== leadId));
        });
        cell.append(checkbox);
        row.prepend(cell);
        const lead = leadCache.current.find((item) => item._id === leadId);
        if (lead && !row.querySelector('.table-lead-date-cell')) {
          const dateCell = document.createElement('td');
          dateCell.className = 'table-lead-date-cell';
          dateCell.textContent = formatExportDate(lead.nextFollowUp || lead.createdAt);
          row.insertBefore(dateCell, row.children[4] || null);
        }
      });
    }

    function pauseEnhancements() {
      pausedRef.current = true;
    }

    function resumeEnhancements(event) {
      leadCache.current = event.detail?.leads || leadCache.current;
      pausedRef.current = false;
      updateSelection([]);
      attachCheckboxes();
    }

    attachCheckboxes();
    window.addEventListener('jb:lead-table-update-start', pauseEnhancements);
    window.addEventListener('jb:lead-table-update-end', resumeEnhancements);
    const { token } = getSession();
    api.leads(token).then((response) => { leadCache.current = response.leads || []; attachCheckboxes(); }).catch(() => {});
    const observer = new MutationObserver(attachCheckboxes);
    observer.observe(document.querySelector('.crm-content') || document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('jb:lead-table-update-start', pauseEnhancements);
      window.removeEventListener('jb:lead-table-update-end', resumeEnhancements);
    };
  }, []);

  async function exportLeads() {
    try {
      const { token } = getSession();
      const response = await api.leads(token);
      const leads = (response.leads || []).filter((lead) => selectedLeadIds.includes(lead._id));
      if (!leads.length) {
        toast.error('Select at least one lead to export.');
        return;
      }
      const headers = ['Lead', 'Company', 'Email', 'Phone', 'Source', 'Status', 'Priority', 'Assigned to', 'Follow-up records'];
      const rows = leads.map((lead) => [lead.name, lead.company, lead.email, lead.phone, lead.source, lead.status, lead.priority || 'Medium', lead.assignedName, lead.followUps?.length || (lead.nextFollowUp ? 1 : 0)]);
      const csv = [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `jb-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} lead${rows.length === 1 ? '' : 's'} exported.`);
    } catch (error) {
      toast.error(error.message);
    }
  }

  function openBulkFollowUp() {
    if (!selectedLeadIds.length) {
      toast.error('Select at least one lead first.');
      return;
    }
    setBulkForm({ date: dayjs().format('YYYY-MM-DD'), nextDate: '', description: '' });
    setBulkDialogOpen(true);
  }

  async function saveBulkFollowUp(event) {
    event.preventDefault();
    const description = bulkForm.description.trim();
    if (!bulkForm.date || !bulkForm.nextDate || !description) {
      toast.error('Activity date, next follow-up date, and description are required.');
      return;
    }
    if (dayjs(bulkForm.nextDate).isBefore(dayjs(bulkForm.date), 'day')) {
      toast.error('Next follow-up date cannot be before the activity date.');
      return;
    }

    setBulkSaving(true);
    try {
      const { token } = getSession();
      const selectedIds = [...selectedLeadIds];
      const results = await Promise.allSettled(
        selectedIds.map((leadId) => api.createFollowUp(token, leadId, { ...bulkForm, description })),
      );
      const successfulCount = results.filter((result) => result.status === 'fulfilled').length;
      const failedCount = results.length - successfulCount;
      if (!successfulCount) {
        const firstError = results.find((result) => result.status === 'rejected');
        throw firstError?.reason || new Error('Unable to add the bulk follow-up.');
      }

      const response = await api.leads(token);
      const refreshedLeads = response.leads || [];
      leadCache.current = refreshedLeads;
      updateSelection([]);
      setBulkDialogOpen(false);
      window.dispatchEvent(new CustomEvent('jb:leads-refreshed', { detail: { leads: refreshedLeads } }));
      if (failedCount) {
        toast.warning(`Follow-up added to ${successfulCount} leads; ${failedCount} failed.`);
      } else {
        toast.success(`Follow-up added to ${successfulCount} selected lead${successfulCount === 1 ? '' : 's'}.`);
      }
    } catch (error) {
      toast.error(error.message || 'Unable to add the bulk follow-up.');
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <>
      <div className="lead-selection-actions">
        <button className="bulk-followup-action" type="button" disabled={!selectedLeadIds.length} onClick={openBulkFollowUp}>
          <CalendarClock size={16} />
          Bulk follow-up
        </button>
        <button className="standalone-export" type="button" disabled={!selectedLeadIds.length} onClick={exportLeads}>
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {bulkDialogOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !bulkSaving && setBulkDialogOpen(false)}>
          <form className="user-modal bulk-followup-modal" onSubmit={saveBulkFollowUp}>
            <div className="modal-heading">
              <div>
                <span className="dashboard-kicker">Bulk activity</span>
                <h2>Set follow-up</h2>
                <p>{selectedLeadIds.length} selected lead{selectedLeadIds.length === 1 ? '' : 's'}</p>
              </div>
              <button className="modal-close" type="button" aria-label="Close" disabled={bulkSaving} onClick={() => setBulkDialogOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="bulk-followup-fields">
              <label>
                <span>Activity date</span>
                <DatePicker
                  className="antd-crm-date"
                  value={bulkForm.date ? dayjs(bulkForm.date) : null}
                  format="DD/MM/YYYY"
                  onChange={(date) => setBulkForm((current) => ({ ...current, date: date ? date.format('YYYY-MM-DD') : '' }))}
                />
              </label>
              <label>
                <span>Next follow-up date</span>
                <DatePicker
                  className="antd-crm-date"
                  value={bulkForm.nextDate ? dayjs(bulkForm.nextDate) : null}
                  format="DD/MM/YYYY"
                  disabledDate={(date) => bulkForm.date ? date.isBefore(dayjs(bulkForm.date), 'day') : false}
                  onChange={(date) => setBulkForm((current) => ({ ...current, nextDate: date ? date.format('YYYY-MM-DD') : '' }))}
                />
              </label>
              <label className="bulk-description-field">
                <span>Description</span>
                <textarea
                  required
                  rows="4"
                  value={bulkForm.description}
                  onChange={(event) => setBulkForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe the follow-up activity for all selected leads"
                />
              </label>
            </div>
            <div className="bulk-selection-note">
              <CalendarClock size={17} />
              This follow-up will be added separately to every selected lead.
            </div>
            <div className="modal-footer">
              <button className="secondary-action" type="button" disabled={bulkSaving} onClick={() => setBulkDialogOpen(false)}>Cancel</button>
              <button className="primary-action" type="submit" disabled={bulkSaving}>{bulkSaving ? 'Saving…' : `Save to ${selectedLeadIds.length} leads`}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default ExportLeadsButton;
