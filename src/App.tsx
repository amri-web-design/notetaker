import NotetakerSettings from "./NotetakerSettings";

export default function App() {
  return (
    <div className="page-wrapper">
      <div className="page-container">
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
      `}</style>
    </div>
  );
}
