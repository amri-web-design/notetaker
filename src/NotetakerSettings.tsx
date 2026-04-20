import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import "./NotetakerSettings.css";

// Messages copied verbatim from the real recruiterflow frontend so the
// prototype reads identically to production:
//   en.aiNotetaker.updatingGeneralSettings  -> "Updating Settings…"
//   en.aiNotetaker.generalSettingsUpdated   -> "Settings updated successfully."
//   en.somethingWentWrong                   -> "Something went wrong"
const MSG_UPDATING = "Updating Settings…";
const MSG_SUCCESS = "Settings updated successfully.";
const MSG_ERROR = "Something went wrong";

// Simulate the latency of the real /api/ai-notetaker/general-settings/edit
// call. The real app flashes "Updating Settings…" while the request is in
// flight and then swaps to "Settings updated successfully." on 200.
const SAVE_LATENCY_MS = 600;

type SnackbarKind = "info" | "success" | "error";
type SnackbarState = { kind: SnackbarKind; message: string } | null;

const PRIMARY_TRIGGER_OPTIONS = [
  { label: "All calls with web-conf link", value: 1 },
  { label: "Meetings with Candidates only", value: 2 },
  { label: "Meetings with Contacts only", value: 3 },
  { label: "Meetings with Candidates OR Contacts", value: 4 },
  { label: "Internal meetings only", value: 5 },
  { label: "External meetings only", value: 6 },
];

const OWNER_OPTIONS = [
  { label: "Where owner is me", value: 1 },
  { label: "Where owner is anyone", value: 2 },
];

const LANGUAGE_OPTIONS = [
  { label: "English", value: 1 },
  { label: "Spanish", value: 2 },
  { label: "French", value: 3 },
  { label: "German", value: 4 },
  { label: "Portuguese", value: 5 },
  { label: "Dutch", value: 6 },
];

const DUE_DATE_OPTIONS = [
  { label: "Day of meeting", value: 1 },
  { label: "1 day after meeting", value: 2 },
  { label: "3 days after meeting", value: 3 },
  { label: "1 week after meeting", value: 4 },
];

const DUE_DATE_TOOLTIP =
  "Default due date is applied when AIRA doesn\u2019t detect one.";

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

  // Other general-settings sections (match the real page)
  const [transcriptLanguage, setTranscriptLanguage] = useState(1);
  const [recordMeeting, setRecordMeeting] = useState(true);
  const [informParticipants, setInformParticipants] = useState(false);
  const [showAiraTasks, setShowAiraTasks] = useState(true);
  const [defaultDueDate, setDefaultDueDate] = useState(1);

  const disabled = !autoInviteEnabled;

  // --- Snackbar (toast) state -----------------------------------------------
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const dismissTimeoutRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);

  // Clear any pending timeouts if the component unmounts mid-save.
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      if (transitionTimeoutRef.current)
        clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  /** Show a snackbar, replacing whatever's currently on screen. */
  const showSnackbar = (
    kind: SnackbarKind,
    message: string,
    autoDismissMs: number | null = 3000,
  ) => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    setSnackbar({ kind, message });
    if (autoDismissMs !== null) {
      dismissTimeoutRef.current = window.setTimeout(
        () => setSnackbar(null),
        autoDismissMs,
      );
    }
  };

  /**
   * Mirror the real app's save flow: flash "Updating Settings…" while the
   * request is in flight, then swap to success on resolve. No backend here,
   * so we use a timeout. `onSuccess` runs before the success toast fires,
   * which mirrors how the Redux action would update form state.
   */
  const simulateSave = (onSuccess?: () => void, simulateFailure = false) => {
    showSnackbar("info", MSG_UPDATING, null);
    if (transitionTimeoutRef.current)
      clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = window.setTimeout(() => {
      if (simulateFailure) {
        showSnackbar("error", MSG_ERROR);
      } else {
        onSuccess?.();
        showSnackbar("success", MSG_SUCCESS);
      }
    }, SAVE_LATENCY_MS);
  };

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
    // Optimistically stage the input clear, then fire the simulated save.
    setExclusionInput("");
    setExclusionError("");
    simulateSave(() => {
      setExcludedEntries([...excludedEntries, lower]);
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setExclusionInput(e.target.value);
    if (exclusionError) setExclusionError("");
  };

  const removeEntry = (entry: string) => {
    simulateSave(() => {
      setExcludedEntries(excludedEntries.filter((e) => e !== entry));
    });
  };

  const handleToggleAutoInvite = () => {
    const next = !autoInviteEnabled;
    setAutoInviteEnabled(next); // update UI immediately; server call follows
    simulateSave();
  };

  const handlePrimaryTriggerChange = (v: number) => {
    setPrimaryTrigger(v);
    simulateSave();
  };

  const handleOwnerTriggerChange = (v: number) => {
    setOwnerTrigger(v);
    simulateSave();
  };

  const handleExcludeBothChange = (checked: boolean) => {
    setExcludeBoth(checked);
    simulateSave();
  };

  const handleLanguageChange = (v: number) => {
    setTranscriptLanguage(v);
    simulateSave();
  };

  const handleRecordMeetingToggle = () => {
    setRecordMeeting((v) => !v);
    simulateSave();
  };

  const handleInformParticipantsToggle = () => {
    setInformParticipants((v) => !v);
    simulateSave();
  };

  const handleShowAiraTasksToggle = () => {
    setShowAiraTasks((v) => !v);
    simulateSave();
  };

  const handleDueDateChange = (v: number) => {
    setDefaultDueDate(v);
    simulateSave();
  };

  return (
    <div className="ns-page">
      <h1 className="ns-page-title">General settings</h1>

      <div className="ns-section ns-section--auto-invite">
      {/* Header: title (with info tooltip) + toggle */}
      <div className="ns-header">
        <div className="ns-title-row">
          <p className="ns-title">Automatically invite AIRA Notetaker to</p>
          <span className="ns-tooltip-wrapper" tabIndex={0}>
            <InfoIcon />
            <span className="ns-tooltip" role="tooltip">
              {HELPER_TEXT}
            </span>
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoInviteEnabled}
          className={`ns-toggle${autoInviteEnabled ? " ns-toggle--on" : ""}`}
          onClick={handleToggleAutoInvite}
        >
          <span className="ns-toggle-thumb" />
        </button>
      </div>

      {/* Two dropdowns */}
      <div className="ns-dropdown-row">
        <Select
          value={primaryTrigger}
          options={PRIMARY_TRIGGER_OPTIONS}
          onChange={handlePrimaryTriggerChange}
          disabled={disabled}
        />
        <Select
          value={ownerTrigger}
          options={OWNER_OPTIONS}
          onChange={handleOwnerTriggerChange}
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
            onChange={(e) => handleExcludeBothChange(e.target.checked)}
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

      {/* Transcript language */}
      <div className="ns-half-section">
        <p className="ns-field-label">TRANSCRIPT LANGUAGE</p>
        <Select
          value={transcriptLanguage}
          options={LANGUAGE_OPTIONS}
          onChange={handleLanguageChange}
        />
      </div>

      {/* Record meeting card */}
      <div className="ns-card">
        <div className="ns-card-row">
          <div className="ns-card-content">
            <h3 className="ns-card-title">Record meeting</h3>
            <p className="ns-card-desc">Capture the video for your meetings</p>
          </div>
          <Toggle
            checked={recordMeeting}
            onClick={handleRecordMeetingToggle}
            ariaLabel="Record meeting"
          />
        </div>
      </div>

      {/* Notification card */}
      <div className="ns-card">
        <h3 className="ns-card-title">Notification</h3>
        <div className="ns-card-row">
          <p className="ns-card-desc ns-card-desc--notification">
            Inform all participants 1 hour prior to a meeting that Recruiterflow
            will be present to record it.
          </p>
          <Toggle
            checked={informParticipants}
            onClick={handleInformParticipantsToggle}
            ariaLabel="Inform participants"
          />
        </div>
      </div>

      {/* AIRA generated Tasks card */}
      <div className="ns-card">
        <div className="ns-card-row">
          <div className="ns-card-content">
            <div className="ns-card-title ns-card-title--with-icon">
              <AiStarIcon />
              <span>AIRA generated Tasks</span>
            </div>
          </div>
        </div>
        <div className="ns-card-row ns-card-row--spaced">
          <div className="ns-card-content">
            <h4 className="ns-card-subtitle">
              Show AIRA generated tasks on the Tasks page
            </h4>
            <p className="ns-card-desc ns-card-desc--muted">
              <InfoIcon /> Control whether tasks created by AIRA Notetaker
              appear on your Task table.
            </p>
          </div>
          <Toggle
            checked={showAiraTasks}
            onClick={handleShowAiraTasksToggle}
            ariaLabel="Show AIRA tasks"
          />
        </div>
        <div className="ns-card-row ns-card-row--border-top">
          <div className="ns-card-content ns-card-content--due-date">
            <div className="ns-field-label-row">
              <p className="ns-field-label">DEFAULT AIRA TASK DUE DATE</p>
              <span className="ns-tooltip-wrapper" tabIndex={0}>
                <InfoIcon />
                <span className="ns-tooltip" role="tooltip">
                  {DUE_DATE_TOOLTIP}
                </span>
              </span>
            </div>
            <Select
              value={defaultDueDate}
              options={DUE_DATE_OPTIONS}
              onChange={handleDueDateChange}
            />
          </div>
        </div>
      </div>

      <Snackbar state={snackbar} onClose={() => setSnackbar(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

function Snackbar({
  state,
  onClose,
}: {
  state: SnackbarState;
  onClose: () => void;
}) {
  if (!state) return null;
  return (
    <div
      className={`ns-snackbar ns-snackbar--${state.kind}`}
      role="status"
      aria-live="polite"
    >
      <span className="ns-snackbar-icon" aria-hidden>
        {state.kind === "info" ? (
          <Spinner />
        ) : state.kind === "success" ? (
          <CheckIcon />
        ) : (
          <AlertIcon />
        )}
      </span>
      <span className="ns-snackbar-message">{state.message}</span>
      {state.kind !== "info" && (
        <button
          type="button"
          className="ns-snackbar-close"
          aria-label="Dismiss"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="ns-spinner"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="14 40"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5 10 17.5 19 7.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line
        x1="12"
        y1="7"
        x2="12"
        y2="13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Force-close if the control becomes disabled mid-open.
  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  return (
    <div
      ref={rootRef}
      className={`ns-select${disabled ? " ns-select--disabled" : ""}${
        open ? " ns-select--open" : ""
      }`}
    >
      <button
        type="button"
        className="ns-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className="ns-select-value">{selected?.label}</span>
        <span className="ns-select-caret" aria-hidden>
          <CaretDownIcon />
        </span>
      </button>
      {open && (
        <ul className="ns-select-menu" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={`ns-select-option${
                  isSelected ? " ns-select-option--selected" : ""
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="ns-select-option-label">{opt.label}</span>
                {isSelected && (
                  <span className="ns-select-option-check" aria-hidden>
                    <CheckIcon />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onClick,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`ns-toggle${checked ? " ns-toggle--on" : ""}`}
      onClick={onClick}
    >
      <span className="ns-toggle-thumb" />
    </button>
  );
}

function AiStarIcon() {
  // Paths copied verbatim from
  // https://d30417wqrqt2r9.cloudfront.net/static/css/rf-icons/ai-star-icon.svg
  // — the same asset the real recruiterflow app serves. Paths are filled
  // white here because the parent .ns-ai-star-icon chip paints the gradient,
  // matching how general-settings.component.scss styles this icon in the
  // real repo (`.ai-star-icon { background: gradient; & svg path { fill: white; } }`).
  return (
    <span className="ns-ai-star-icon" aria-hidden>
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10.7941 3.46852C10.8231 3.22469 11.1769 3.22469 11.2059 3.46852L11.4486 5.51407C11.762 8.15543 13.8445 10.2379 16.4858 10.5514L18.5314 10.7941C18.7752 10.823 18.7752 11.1768 18.5314 11.2058L16.4858 11.4485C13.8445 11.7619 11.762 13.8444 11.4486 16.4858L11.2059 18.5313C11.1769 18.7752 10.8231 18.7752 10.7941 18.5313L10.5514 16.4858C10.238 13.8444 8.15549 11.7619 5.51413 11.4485L3.46858 11.2058C3.22475 11.1768 3.22475 10.823 3.46858 10.7941L5.51413 10.5514C8.15549 10.2379 10.238 8.15543 10.5514 5.51407L10.7941 3.46852Z"
          fill="white"
        />
        <path
          d="M16.0741 3.3466C16.0837 3.26532 16.2017 3.26532 16.2113 3.3466L16.2922 4.02845C16.3967 4.90891 17.0909 5.60308 17.9713 5.70755L18.6532 5.78845C18.7344 5.7981 18.7344 5.91604 18.6532 5.9257L17.9713 6.0066C17.0909 6.11107 16.3967 6.80524 16.2922 7.68569L16.2113 8.36754C16.2017 8.44882 16.0837 8.44882 16.0741 8.36754L15.9932 7.68569C15.8887 6.80524 15.1945 6.11107 14.3141 6.0066L13.6322 5.9257C13.5509 5.91604 13.5509 5.7981 13.6322 5.78845L14.3141 5.70755C15.1945 5.60308 15.8887 4.90891 15.9932 4.02845L16.0741 3.3466Z"
          fill="white"
        />
      </svg>
    </span>
  );
}

function CaretDownIcon() {
  // Matches FontAwesome "fas caret-down" shape — solid triangle pointing down.
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 320 512"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8H32c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="ns-info-icon"
      width="16"
      height="16"
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
