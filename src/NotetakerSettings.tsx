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
  { label: "Meetings with candidates only", value: 2 },
  { label: "Meetings with Contacts only", value: 3 },
  { label: "Meetings with candidates OR Contacts", value: 4 },
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

  return (
    <div className="ns-section">
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
        <CaretDownIcon />
      </span>
    </div>
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
