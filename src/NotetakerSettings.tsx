import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import "./NotetakerSettings.css";

const PRIMARY_TRIGGER_OPTIONS = [
  { label: "All calls with web-conf link", value: 1 },
  { label: "Meetings with candidates only", value: 2 },
  { label: "Meetings with clients/contacts only", value: 3 },
  { label: "Meetings with candidates OR clients/contacts", value: 4 },
  { label: "Internal meetings only", value: 5 },
  { label: "External meetings only", value: 6 },
];

const OWNER_OPTIONS = [
  { label: "Where owner is me", value: 1 },
  { label: "Where owner is anyone", value: 2 },
];

const HELPER_TEXT =
  "Changes to these settings apply immediately to calendar events created from now on. If new settings would prevent the bot from joining already-scheduled meetings, those invites will be cancelled. The bot will never be added to meetings scheduled before the change.";

function isValidDomainOrEmail(raw: string): boolean {
  const entry = raw.trim();
  if (!entry) return false;
  if (entry.includes("@")) {
    const parts = entry.split("@");
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || !domain) return false;
    const dotIdx = domain.indexOf(".");
    if (dotIdx <= 0 || dotIdx >= domain.length - 1) return false;
    if (domain.split(".").some((p) => !p)) return false;
    return true;
  }
  const dotIdx = entry.indexOf(".");
  if (dotIdx <= 0 || dotIdx >= entry.length - 1) return false;
  if (entry.split(".").some((p) => !p)) return false;
  return true;
}

export default function NotetakerSettings() {
  const [autoInviteEnabled, setAutoInviteEnabled] = useState(true);
  const [primaryTrigger, setPrimaryTrigger] = useState(4);
  const [ownerTrigger, setOwnerTrigger] = useState(1);
  const [excludeBoth, setExcludeBoth] = useState(true);
  const [excludedEntries, setExcludedEntries] = useState<string[]>([
    "clientcorp.com",
    "john@example.com",
  ]);
  const [exclusionInput, setExclusionInput] = useState("");
  const [exclusionError, setExclusionError] = useState("");

  const disabled = !autoInviteEnabled;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = exclusionInput.trim();
    if (!trimmed) return;
    if (!isValidDomainOrEmail(trimmed)) {
      setExclusionError(
        "Enter valid domain (example.com) or email (user@example.com)",
      );
      return;
    }
    const lower = trimmed.toLowerCase();
    if (excludedEntries.includes(lower)) {
      setExclusionInput("");
      setExclusionError("");
      return;
    }
    setExcludedEntries([...excludedEntries, lower]);
    setExclusionInput("");
    setExclusionError("");
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setExclusionInput(e.target.value);
    if (exclusionError) setExclusionError("");
  };

  const removeEntry = (entry: string) => {
    setExcludedEntries(excludedEntries.filter((e) => e !== entry));
  };

  return (
    <div className="ns-section">
      {/* Header: title + toggle */}
      <div className="ns-header">
        <p className="ns-title">Automatically invite AIRA Notetaker to</p>
        <button
          type="button"
          role="switch"
          aria-checked={autoInviteEnabled}
          className={`ns-toggle${autoInviteEnabled ? " ns-toggle--on" : ""}`}
          onClick={() => setAutoInviteEnabled(!autoInviteEnabled)}
        >
          <span className="ns-toggle-thumb" />
        </button>
      </div>

      {/* Helper text */}
      <div className="ns-helper-row">
        <InfoIcon />
        <p className="ns-helper-text">{HELPER_TEXT}</p>
      </div>

      {/* Two dropdowns */}
      <div className="ns-dropdown-row">
        <Select
          value={primaryTrigger}
          options={PRIMARY_TRIGGER_OPTIONS}
          onChange={setPrimaryTrigger}
          disabled={disabled}
        />
        <Select
          value={ownerTrigger}
          options={OWNER_OPTIONS}
          onChange={setOwnerTrigger}
          disabled={disabled}
        />
      </div>

      {/* Smart exclusion filters */}
      <div
        className={`ns-exclusion${disabled ? " ns-exclusion--disabled" : ""}`}
      >
        <p className="ns-exclusion-title">SMART EXCLUSION FILTERS</p>

        <label className="ns-checkbox-row">
          <input
            type="checkbox"
            checked={excludeBoth}
            disabled={disabled}
            onChange={(e) => setExcludeBoth(e.target.checked)}
          />
          <div className="ns-checkbox-content">
            <div className="ns-checkbox-label">
              <span>Exclude if BOTH candidate AND contact are invited</span>
              <span className="ns-badge-recommended">RECOMMENDED</span>
            </div>
            <p className="ns-checkbox-helper">
              Prevents the notetaker from joining client interviews —
              recommended for search firms.
            </p>
          </div>
        </label>

        <div className="ns-domain-block">
          <p className="ns-domain-title">
            Exclude specific email domains or addresses
          </p>
          <p className="ns-domain-subtitle">
            Meetings that include any of these will be skipped by the bot.
          </p>

          {excludedEntries.length > 0 && (
            <div className="ns-chips">
              {excludedEntries.map((entry) => (
                <span key={entry} className="ns-chip">
                  <span className="ns-chip-text">{entry}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${entry}`}
                    className="ns-chip-remove"
                    onClick={() => removeEntry(entry)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            type="text"
            className={`ns-domain-input${
              exclusionError ? " ns-domain-input--error" : ""
            }`}
            placeholder="example.com, user@example.com"
            value={exclusionInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />

          {exclusionError ? (
            <p className="ns-domain-error">{exclusionError}</p>
          ) : excludedEntries.length === 0 ? (
            <p className="ns-domain-helper">
              Press Enter after typing each domain or email to add it to the
              exclusion list.
            </p>
          ) : (
            <p className="ns-domain-helper">
              Domains match any sub-domain (e.g.{" "}
              <em>clientcorp.com</em> also blocks{" "}
              <em>mail.clientcorp.com</em>). Emails match exactly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

type Option = { label: string; value: number };

function Select({
  value,
  options,
  onChange,
  disabled,
}: {
  value: number;
  options: Option[];
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`ns-select${disabled ? " ns-select--disabled" : ""}`}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="ns-select-caret" aria-hidden>
        ▾
      </span>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg
      className="ns-helper-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line
        x1="12"
        y1="10"
        x2="12"
        y2="17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
