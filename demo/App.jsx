import CanvasDraw from "../src/CanvasDraw.jsx";

function App() {
  const handleCustomSave = async (blob, filename) => {
    console.log("Custom save handler called:", filename);
    // You can implement custom save logic here
    // For example, upload to a different endpoint or handle differently
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <CanvasDraw
        uploadUrl='/images/anki/'
        defaultFilename='my-drawing'
        showScrollProxy={true}
        defaultColors={["#000000", "#0000ff", "#ff0000"]}
        storageKey='canvasDraw'
        // onSave={handleCustomSave} // Uncomment to use custom save handler
      />
    </div>
  );
}

export default App;
