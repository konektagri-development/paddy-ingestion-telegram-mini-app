"use client";

import { useEffect, useState } from "react";
import { PaddyVisitForm } from "@/components/form/paddy-visit-form";
import { LanguageSelector } from "@/components/language-selector";
import { usePlatform } from "@/components/telegram-provider";
import { WebLoginForm } from "@/components/web-login-form";
import { useLanguage } from "@/lib/i18n/language-context";

export default function Home() {
	const { language } = useLanguage();
	const { isWeb, isLoading: isPlatformLoading } = usePlatform();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [loginError, setLoginError] = useState<string | null>(null);
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);

	// Check for existing token on mount (persistent login)
	useEffect(() => {
		if (typeof window !== "undefined") {
			const savedToken = localStorage.getItem("web-auth-token");
			const savedSurveyorInfo = localStorage.getItem("web-surveyor-info");

			// If token and surveyor info exist, user is already logged in
			if (savedToken && savedSurveyorInfo) {
				setIsAuthenticated(true);
			}
		}
		setIsCheckingAuth(false);
	}, []);

	// Show loading while detecting platform or checking auth
	if (isPlatformLoading || isCheckingAuth) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
			</div>
		);
	}

	// Web users need to login
	if (isWeb && !isAuthenticated) {
		const handleLogin = async (credentials: {
			username: string;
			password: string;
			surveyorName: string;
			phoneNumber: string;
		}) => {
			setIsLoggingIn(true);
			setLoginError(null);

			try {
				const response = await fetch("/api/auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(credentials),
				});

				const data = await response.json();

				if (!response.ok || !data.success) {
					setLoginError(data.message || "Login failed");
					return;
				}

				// Store token and surveyor info for later API calls
				localStorage.setItem("web-auth-token", data.token);
				localStorage.setItem(
					"web-surveyor-info",
					JSON.stringify({
						surveyorName: credentials.surveyorName,
						phoneNumber: credentials.phoneNumber,
					}),
				);

				setIsAuthenticated(true);
			} catch {
				setLoginError("Login failed. Please try again.");
			} finally {
				setIsLoggingIn(false);
			}
		};

		return (
			<WebLoginForm
				onLogin={handleLogin}
				isLoading={isLoggingIn}
				error={loginError}
			/>
		);
	}

	if (!language) {
		return <LanguageSelector />;
	}

	return <PaddyVisitForm />;
}
