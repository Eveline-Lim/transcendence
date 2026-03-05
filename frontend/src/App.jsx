import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Friends from "./pages/Friends";
import Stats from "./pages/Stats";
import Leaderboard from "./pages/Leaderboard";
import Game from "./pages/Game";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TwoFAQRCode from "./pages/TwoFAQRCode";
import TwoFACode from "./pages/TwoFACode";
import ConfirmDisable2FA from "./pages/ConfirmDisable2FA";
import PageNotFound from "./pages/PageNotFound";

export default function App() {
	return (
		<AuthProvider>
			<BrowserRouter>
				<Routes>
					{/* Auth */}
					<Route path="/" element={<Auth />} />
					<Route path="/password/forgot" element={<ForgotPassword />} />
					<Route path="/password/reset" element={<ResetPassword />} />
					<Route path="/twofaCode" element={<TwoFACode />} />
					<Route path="/twofa/enable" element={<TwoFAQRCode />} />
					<Route path="/twofa/disable" element={<ConfirmDisable2FA />} />
					
					{/* Main */}
					<Route path="/home" element={<Home />} />
					<Route path="/profile" element={<Profile />} />
					<Route path="/friends" element={<Friends />} />
					<Route path="/stats" element={<Stats />} />
					<Route path="/leaderboard" element={<Leaderboard />} />

					{/* Game modes (placeholder) */}
					<Route path="/play/ranked" element={<Game />} />
					<Route path="/play/casual" element={<Game />} />
					<Route path="/play/ai:difficulty" element={<Game />} />
					<Route path="/play/offline" element={<Game />} />

					{/* 404 */}
					<Route path="*" element={<PageNotFound />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}
