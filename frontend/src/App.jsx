import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth.jsx";
import Game from "./pages/Game.jsx";

function App() {
	return (
		<div className="min-h-screen">
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<Auth />} />
					<Route path="/game" element={<Game />} />
				</Routes>
			</BrowserRouter>
		</div>
	);
}

export default App;
