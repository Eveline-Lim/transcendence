import { useState } from "react";
import { sendData } from "../sendData.jsx";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import FormButton from "../components/FormButton.jsx";

const tagColors = {
  REQUIRED:    { text: "text-red-400",     border: "border-red-400/30"     },
  ACCOUNT:     { text: "text-sky-400",     border: "border-sky-400/30"     },
  "FAIR-PLAY": { text: "text-emerald-400", border: "border-emerald-400/30" },
  PROFILE:     { text: "text-yellow-400",  border: "border-yellow-400/30"  },
  SLA:         { text: "text-violet-400",  border: "border-violet-400/30"  },
  IP:          { text: "text-pink-500",    border: "border-pink-500/30"    },
  LEGAL:       { text: "text-orange-400",  border: "border-orange-400/30"  },
};

const accentForTag = {
  REQUIRED:    "border-l-red-400",
  ACCOUNT:     "border-l-sky-400",
  "FAIR-PLAY": "border-l-emerald-400",
  PROFILE:     "border-l-yellow-400",
  SLA:         "border-l-violet-400",
  IP:          "border-l-pink-500",
  LEGAL:       "border-l-orange-400",
};

const sections = [
  {
    id: "01",
    title: "Acceptance of Terms",
    tag: "REQUIRED",
    content:
      "By creating an account and accessing ft_transcendence, you fully and unconditionally accept these Terms of Service. If you do not accept these terms, you must not use the service. These terms may be updated; the current version is always accessible from within the application.",
  },
  {
    id: "02",
    title: "Access to the Service",
    tag: "ACCOUNT",
    content:
      "Access to the game requires creating an account with a valid email address, or via OAuth (42, Google, etc.). You are responsible for keeping your credentials confidential. Any unauthorized access must be reported immediately. One account per person is allowed. The project team reserves the right to suspend or delete any account in violation of these terms.",
  },
  {
    id: "03",
    title: "Code of Conduct",
    tag: "FAIR-PLAY",
    content:
      "It is strictly forbidden to: cheat or use automated programs (bots) to play, harass or intimidate other players, attempt to hack or disrupt the server, impersonate another user, or use an offensive, discriminatory, or illegal username. Any violation may result in immediate suspension.",
  },
  {
    id: "04",
    title: "User Content",
    tag: "PROFILE",
    content:
      "You retain ownership of content you publish (username, avatar). By uploading it, you grant the service a limited license to display it to other players. You are solely responsible for its legality. Any content infringing third-party rights, or that is unlawful or offensive, will be removed.",
  },
  {
    id: "05",
    title: "Service Availability",
    tag: "SLA",
    content:
      'ft_transcendence is a student project provided "as is", with no guarantee of continuous availability. Service interruptions may occur for maintenance or malfunction. No liability can be accepted for data loss or loss of access resulting from such interruptions.',
  },
  {
    id: "06",
    title: "Intellectual Property",
    tag: "IP",
    content:
      "The source code, design, and all elements of the project are the property of their respective authors within the École 42 curriculum. The name Pong is a registered trademark; this project is for educational, non-commercial purposes only. Any redistribution for commercial use is prohibited.",
  },
  {
    id: "07",
    title: "Limitation of Liability",
    tag: "LEGAL",
    content:
      "To the extent permitted by applicable law, the project authors disclaim all liability for direct or indirect damages resulting from the use or inability to use the service. As this is an educational project, no financial transactions are involved.",
  },
  {
    id: "08",
    title: "Termination",
    tag: "ACCOUNT",
    content:
      "You may delete your account at any time from your settings. The project team reserves the right to terminate your access in the event of a breach of these terms, without prior notice. Upon termination, your data will be deleted in accordance with our Privacy Policy.",
  },
];

export default function TermsOfService() {
	const navigate = useNavigate();
	const [openSection, setOpenSection] = useState(null);
	const [accepted] = useState(false);

	const token = localStorage.getItem("token");
	const acceptTermsOfService = async () => {
		try {
			const res = await sendData("/api/v1/auth/accept/terms-service", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (res.success) {
				navigate("/home", { replace: true });
			} else {
				setError(res.message || "Failed to accept terms of service");
			}
		} catch (error) {
			console.log("An error occurred: ", error);
		}
	}

  return (
    <div className="relative min-h-screen bg-gray-950 text-gray-300 font-mono overflow-x-hidden">

      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)",
        }}
      />

      {/* Header */}
      <header
        className="border-b border-gray-800 px-4 sm:px-8 pt-10 sm:pt-12 pb-7 sm:pb-8"
        style={{ background: "linear-gradient(160deg, #030712 0%, #0d1117 60%, #030712 100%)" }}
      >
        <div className="max-w-3xl mx-auto">

			{/* Back button */}
			<BackButton to="/" />

          {/* Top row */}
          <div className="flex justify-between items-center mb-5 sm:mb-6">
            <span className="inline-block border border-emerald-400 text-emerald-400 text-xs tracking-widest px-3 py-1">
              TRANSCENDENCE
            </span>
            <span className="text-xs text-gray-700 tracking-widest">v1.0</span>
          </div>

          {/* Title + scoreboard — stacks on mobile */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-5 sm:gap-6 mb-5 sm:mb-6">
            <h1 className="text-4xl sm:text-5xl font-black leading-none tracking-tighter text-white">
              TERMS
              <br />
              <span
                className="text-red-400"
                style={{ textShadow: "0 0 24px rgba(248,113,113,0.35)" }}
              >
                OF SERVICE
              </span>
            </h1>

            {/* Status board */}
            <div className="flex items-center gap-5 sm:gap-6 border border-gray-800 bg-gray-900 px-5 sm:px-6 py-3 sm:py-4 w-full sm:w-auto">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-600 tracking-widest uppercase">
                  Sections
                </span>
                <span className="text-base sm:text-lg font-black text-white tracking-wide">
                  0{sections.length}
                </span>
              </div>
              <div className="w-px h-9 sm:h-10 bg-gray-800" />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-600 tracking-widest uppercase">
                  Status
                </span>
                <span
                  className={`text-base sm:text-lg font-black tracking-wide transition-colors duration-300 ${
                    accepted ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {accepted ? "ACCEPTED" : "PENDING"}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-gray-600 max-w-lg">
            Terms governing the use of ft_transcendence, an École 42 student
            project. Please read carefully before using the service.
          </p>
        </div>
      </header>

      {/* Sections */}
      <main className="max-w-3xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-2">
        {sections.map((section) => {
          const isOpen = openSection === section.id;
          const colors = tagColors[section.tag] || tagColors["FAIR-PLAY"];
          const accentClass = accentForTag[section.tag] || "border-l-emerald-400";

          return (
            <div
              key={section.id}
              className={`border-b border-gray-800 transition-all duration-200 border-l-2 ${
                isOpen
                  ? `${accentClass} pl-3 sm:pl-3 -ml-3 sm:-ml-3.5`
                  : "border-l-transparent"
              }`}
            >
              <button
                className="w-full flex items-center gap-3 sm:gap-4 py-4 sm:py-5 text-left group"
                onClick={() => setOpenSection(isOpen ? null : section.id)}
              >
                <span className="text-xs text-gray-700 tracking-widest w-7 shrink-0">
                  {section.id}
                </span>
                <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-gray-300 group-hover:text-white transition-colors">
                    {section.title}
                  </span>
                  <span
                    className={`text-xs tracking-widest px-2 py-0.5 border shrink-0 ${colors.text} ${colors.border}`}
                  >
                    {section.tag}
                  </span>
                </div>
                <span
                  className={`text-xs shrink-0 transition-transform duration-200 ${colors.text}`}
                  style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                >
                  ▶
                </span>
              </button>

              {isOpen && (
                <div className="pl-8 sm:pl-11 pb-5 sm:pb-6">
                  <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-gray-500">
                    {section.content}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </main>

      {/* Accept block */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border border-emerald-400/20 bg-emerald-400/5 px-5 sm:px-8 py-6 sm:py-7">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">
              {accepted ? "✓  Terms Accepted" : "Accept Terms"}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              By clicking this button, you confirm that you have read and
              accepted the full Terms of Service.
            </p>
          </div>
			<FormButton variant="secondary" onClick={acceptTermsOfService}
			className={`w-full sm:w-auto shrink-0 border border-emerald-400 px-6 sm:px-7 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-200 ${
				accepted
                ? "bg-emerald-400 text-gray-950"
                : "text-emerald-400 hover:bg-emerald-400/10"
            }`}
			>
            {accepted ? "ACCEPTED ✓" : "ACCEPT"}
			</FormButton>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 sm:px-8 pb-10 sm:pb-12 text-center">
        <div
          className="h-px mb-6"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(248,113,113,0.25), transparent)",
          }}
        />
        <p className="text-xs tracking-widest text-gray-700 uppercase mb-2">
          ft_transcendence · École 42 ·{" "}
          <span className="text-emerald-400">Student Project</span>
        </p>
        <p className="text-xs text-gray-800">
          These terms are governed by French law. Last updated:{" "}
          {new Date().toLocaleDateString("en-GB")}
        </p>
      </footer>
    </div>
  );
}
