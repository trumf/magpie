// App.js
import {AppProvider} from "./contexts/AppContext";
import Reader from "./components/reader/Reader";
import "./styles/global.css";

const App = () => {
  return (
    <AppProvider>
      <Reader />
    </AppProvider>
  );
};

export default App;

/*
import MarkdownReader from "./MarkdownReader";
import "./reset.css";
import "./App.css";
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
*/
