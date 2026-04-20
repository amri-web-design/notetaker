import NotetakerSettings from "./NotetakerSettings";

export default function App() {
  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">General settings</h1>
          <p className="page-subtitle">
            Preview of the new "Automatically invite AIRA Notetaker to" section.
            Prototype for dev team review — all interactions are local state
            only.
          </p>
        </div>
        <NotetakerSettings />
      </div>

      <style>{`
        .page-wrapper {
          min-height: 100vh;
          padding: 40px 24px;
          display: flex;
          justify-content: center;
        }
        .page-container {
          max-width: 720px;
          width: 100%;
        }
        .page-header {
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #0b1726;
        }
        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
          line-height: 20px;
        }
      `}</style>
    </div>
  );
}
