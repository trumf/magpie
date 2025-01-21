import MarkdownReader from "./MarkdownReader";
import "./reset.css";
// Add this to your index.js or App.js
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "ServiceWorker registration successful:",
          registration.scope
        );
      })
      .catch((error) => {
        console.log("ServiceWorker registration failed:", error);
      });
  });
}

function App() {
  return (
    <div className="App">
      <MarkdownReader />
    </div>
  );
}

export default App;
