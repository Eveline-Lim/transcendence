import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendData } from "../sendData.jsx";
import BackButton from "../components/BackButton.jsx";
import FormButton from "../components/FormButton.jsx";

const sections = [
  {
    id: "01",
    title: "Data We Collect",
    items: [
      {
        subtitle: "Account Information",
        text: "When you register, we collect your email address, username, and avatar. This information is required for the service to function and to identify your account.",
      },
      {
        subtitle: "OAuth Authentication",
        text: "If you sign in via a third-party provider (42 account, Google, etc.), we only receive what that provider authorizes — typically your email and display name. We never store your third-party password.",
      },
      {
        subtitle: "Game Data",
        text: "We record your match history: scores, results (win/loss), opponents, dates, and durations. This data powers leaderboards and your personal statistics.",
      },
    ],
  },
  {
    id: "02",
    title: "How We Use Your Data",
    items: [
      {
        subtitle: "Purposes",
        text: "Your data is used exclusively to run the game, display your profile, maintain leaderboards, and improve the user experience. No data is used for advertising or commercial purposes.",
      },
      {
        subtitle: "Sharing",
        text: "We never sell, rent, or transfer your personal data to third parties. Your username and game statistics are visible to other players as part of the normal service.",
      },
    ],
  },
  {
    id: "03",
    title: "Security & Storage",
    items: [
      {
        subtitle: "Protection",
        text: "Data is stored securely. Passwords are hashed using bcrypt. Sessions are managed via secure, time-limited tokens — no credentials are stored in plain text.",
      },
      {
        subtitle: "Retention Period",
        text: "Your data is retained for as long as your account is active. Upon account deletion, all your personal data is erased within 30 days.",
      },
    ],
  },
  {
    id: "04",
    title: "Your Rights (GDPR)",
    items: [
      {
        subtitle: "Access & Rectification",
        text: "You have the right to access, correct, and delete your data. You can update your username and avatar at any time from your profile settings.",
      },
      {
        subtitle: "Account Deletion",
        text: "You can request the complete deletion of your account and all associated data from your profile settings. This action is irreversible.",
      },
    ],
  },
  {
    id: "05",
    title: "No Cookies Policy",
    items: [
      {
        subtitle: "Zero Tracking",
        text: "ft_transcendence does not use any cookies — not for tracking, not for advertising, not for analytics. Session management is handled entirely via secure HTTP-only tokens stored server-side. Nothing is written to your browser's storage.",
      },
    ],
  },
];

export default function PrivacyPolicy() {
	const [openSection, setOpenSection] = useState(null);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	const token = localStorage.getItem("token");
	const acceptPrivacyPolicy = async () => {
		try {
			const res = await sendData("/api/v1/auth/accept/privacy-policy", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (res.success) {
				navigate("/terms-service", { replace: true });
			} else {
				setError(res.message || "Failed to accept privacy policy");
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
        className="border-b border-gray-800 px-4 sm:px-8 pt-10 sm:pt-16 pb-8 sm:pb-10"
        style={{ background: "linear-gradient(135deg, #030712 0%, #0d1117 60%, #030712 100%)" }}
      >
        <div className="max-w-3xl mx-auto flex justify-between items-start gap-6">

          <div className="flex-1 min-w-0">

            {/* Back button */}
			<BackButton to="/" />

            <span className="inline-block border border-emerald-400 text-emerald-400 text-xs tracking-widest px-3 py-1 mb-5 sm:mb-6">
              TRANSCENDENCE
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-none tracking-tighter mb-4 text-white">
              PRIVACY
              <br />
              <span
                className="text-emerald-400"
                style={{ textShadow: "0 0 24px rgba(52,211,153,0.4)" }}
              >
                POLICY
              </span>
            </h1>

            <p className="text-xs tracking-widest text-gray-600 mb-4 sm:mb-5">
              Last updated:{" "}
              <span className="text-emerald-400">
                {new Date().toLocaleDateString("en-GB")}
              </span>
            </p>

            <p className="text-sm leading-relaxed text-gray-500 max-w-md">
              This document describes how we collect, use, and protect your
              data within ft_transcendence.
            </p>

          </div>

          {/* Pong decoration */}
          <div className="hidden sm:flex flex-col items-center justify-center gap-10 opacity-10 pr-2 pt-4 shrink-0">
            <div className="w-2 h-14 bg-white" />
            <div className="w-3 h-3 rounded-full bg-white" />
            <div className="w-2 h-14 bg-white" />
          </div>

        </div>
      </header>

      {/* Sections */}
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {sections.map((section) => {
          const isOpen = openSection === section.id;

          return (
            <div
              key={section.id}
              className={`border-b border-gray-800 transition-all duration-200 border-l-2 ${
                isOpen
                  ? "border-l-emerald-400 pl-3 sm:pl-4 -ml-3 sm:-ml-[18px]"
                  : "border-l-transparent"
              }`}
            >
              <button
                className="w-full flex items-center gap-3 sm:gap-5 py-5 sm:py-6 text-left group"
                onClick={() => setOpenSection(isOpen ? null : section.id)}
              >
                <span className="text-xs text-emerald-400 tracking-widest w-7 shrink-0">
                  {section.id}
                </span>

                <span className="flex-1 text-xs sm:text-sm font-bold tracking-widest uppercase text-gray-200 group-hover:text-white transition-colors">
                  {section.title}
                </span>

                <span
                  className="text-xs text-emerald-400 shrink-0 transition-transform duration-200"
                  style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                >
                  ▶
                </span>
              </button>

              {isOpen && (
                <div className="pb-6 sm:pb-7 space-y-5">
                  {section.items.map((item, i) => (
                    <div key={i} className="pl-8 sm:pl-12">
                      <div className="text-xs text-emerald-400 tracking-widest uppercase mb-2">
                        {item.subtitle}
                      </div>

                      <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-gray-500">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Agree button */}
        <div className="max-w-xs mx-auto mt-10">
		<FormButton variant="secondary" onClick={acceptPrivacyPolicy}>I agree</FormButton>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 sm:px-8 pb-10 sm:pb-12 text-center">
        <div
          className="h-px mb-6"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(52,211,153,0.3), transparent)",
          }}
        />

        <p className="text-xs tracking-widest text-gray-700 uppercase mb-2">
          ft_transcendence · École 42 ·{" "}
          <span className="text-emerald-400">Student Project</span>
        </p>

        <p className="text-xs text-gray-800">
          For any questions regarding your data, please contact the project administrators.
        </p>
      </footer>

    </div>
  );
}
