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
          padding: 40px 24px 80px;
          display: flex;
          justify-content: center;
        }
        .page-container {
          width: 100%;
          max-width: 1000px;
        }
      `}</style>
    </div>
  );
}
