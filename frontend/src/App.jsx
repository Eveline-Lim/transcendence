import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth.jsx";
import Game from "./pages/Game.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

function App() {
	return (
		<div className="min-h-screen">
			<BrowserRouter>
			<Routes>
				<Route path="/" element={<Auth />} />
				<Route path="/password/forgot" element={<ForgotPassword />} />
				<Route path="/password/reset" element={<ResetPassword />} />
				<Route path="/game" element={<Game />} />
			</Routes>
			</BrowserRouter>
		</div>
	);
}

export default App;
