import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth.jsx";
import Game from "./pages/Game.jsx";
import Profile from "./pages/Profile.jsx";
import TwoFAQRCode from "./pages/TwoFAQRCode.jsx";
import TwoFACode from "./pages/TwoFACode.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import PageNotFound from "./pages/PageNotFound.jsx";

function App() {
	return (
		<div className="min-h-screen">
			<BrowserRouter>
			<Routes>
				<Route path="/" element={<Auth />} />
				<Route path="/password/forgot" element={<ForgotPassword />} />
				<Route path="/password/reset" element={<ResetPassword />} />
				<Route path="/game" element={<Game />} />
				<Route path="/profile" element={<Profile />} />
				<Route path="/qrCode" element={<TwoFAQRCode />} />
				<Route path="/twofaCode" element={<TwoFACode />} />
				<Route path="/404" element={<PageNotFound />} />
				<Route path="*" element={<PageNotFound />} />
			</Routes>
			</BrowserRouter>
		</div>
	);
}

export default App;
