import { useEffect, useRef, useState } from "react";
import { DatePicker, Select } from "antd";
import dayjs from "dayjs";
import { Plus } from "lucide-react";

function PhoneLink({ phone, fallback = "No phone" }) {
  if (!phone || !/\d/.test(String(phone))) return fallback;
  const dialNumber = String(phone).replace(/[^\d+]/g, "");
  return <a className="phone-link" href={`tel:${dialNumber}`}>{phone}</a>;
}

function RoleDropdown({ value, onChange }) {
  return (
    <Select
      className="antd-crm-select"
      placement="topLeft"
      showSearch
      optionFilterProp="label"
      value={value || undefined}
      onChange={onChange}
      options={[
        { value: 2, label: "User", detail: "Standard CRM access" },
        { value: 1, label: "Admin", detail: "Full CRM access" },
      ]}
      optionRender={(option) => (
        <span className="antd-option-rich">
          <b>{option.data.label.slice(0, 1)}</b>
          <span>
            <strong>{option.data.label}</strong>
            <small>{option.data.detail}</small>
          </span>
        </span>
      )}
    />
  );
}

function AssigneeDropdown({ users, value, disabled, onChange }) {
  return (
    <Select
      className="antd-crm-select antd-assignee-select"
      showSearch
      optionFilterProp="label"
      value={value || undefined}
      disabled={disabled}
      placeholder="Select a user"
      onChange={onChange}
      options={users.map((user) => ({
        value: user._id,
        label: `${user.name} - ${user.roleLabel}`,
      }))}
    />
  );
}

function LeadDropdown({ value, options, placeholder, onChange, showStatusIndicator = true, disabled = false, loading = false, ariaLabel, manageLabel, onManage }) {
  const [open, setOpen] = useState(false);
  return (
    <Select
      className="antd-crm-select antd-lead-select"
      aria-label={ariaLabel}
      aria-busy={loading}
      loading={loading}
      placement="topLeft"
      autoAdjustOverflow={false}
      value={value || undefined}
      placeholder={placeholder}
      showSearch
      optionFilterProp="label"
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      onChange={onChange}
      options={options.map((option) => ({ value: option, label: option }))}
      labelRender={(option) => (
        <span
          className={`antd-selected-status status-${String(option.value).toLowerCase().replace(/\s/g, "-")}`}
        >
          {showStatusIndicator && <i />}
          {option.label}
        </span>
      )}
      optionRender={(option) => (
        <span
          className={`antd-status-option status-${String(option.data.value).toLowerCase().replace(/\s/g, "-")}`}
        >
          {showStatusIndicator && <i />}
          {option.data.label}
        </span>
      )}
      popupRender={(menu) => (
        <>
          {menu}
          {onManage && (
            <>
              <div className="dropdown-management-divider" />
              <button
                className="dropdown-management-action"
                type="button"
                onClick={() => {
                  setOpen(false);
                  onManage();
                }}
              >
                <Plus size={14} />
                {manageLabel || "Manage values"}
              </button>
            </>
          )}
        </>
      )}
    />
  );
}

function AntDatePicker({ value, onChange, required = false }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick, true);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick, true);
  }, []);
  return (
    <span ref={pickerRef} className="antd-date-picker-wrap">
      <DatePicker
        className="antd-crm-date"
        open={open}
        value={value ? dayjs(value) : null}
        onOpenChange={setOpen}
        onChange={(date) => {
          onChange(date ? date.format("YYYY-MM-DD") : "");
          setOpen(false);
        }}
        getPopupContainer={(trigger) => trigger.parentElement}
        format="DD/MM/YYYY"
        required={required}
      />
    </span>
  );
}


export { AntDatePicker, AssigneeDropdown, LeadDropdown, PhoneLink, RoleDropdown };
