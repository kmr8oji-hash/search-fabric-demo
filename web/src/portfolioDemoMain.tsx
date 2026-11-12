import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PortfolioDemo } from "./PortfolioDemo";

createRoot(document.getElementById("root")!).render(<StrictMode><PortfolioDemo /></StrictMode>);
