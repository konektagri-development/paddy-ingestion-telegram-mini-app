"use client";

import {
	AlertCircle,
	Loader2,
	Lock,
	LogIn,
	Phone,
	User,
	UserCircle,
	Wheat,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LoginCredentials {
	username: string;
	password: string;
	surveyorName: string;
	phoneNumber: string;
}

interface WebLoginFormProps {
	onLogin: (credentials: LoginCredentials) => void;
	isLoading?: boolean;
	error?: string | null;
}

// Validate Cambodian phone number: starts with 0, 9 or 10 digits total
function isValidPhoneNumber(phone: string): boolean {
	// Remove any spaces or dashes
	const cleaned = phone.replace(/[\s-]/g, "");
	// Must start with 0 and be 9 or 10 digits
	return /^0\d{8,9}$/.test(cleaned);
}

export function WebLoginForm({ onLogin, isLoading, error }: WebLoginFormProps) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [surveyorName, setSurveyorName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [phoneError, setPhoneError] = useState<string | null>(null);

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setPhoneNumber(value);
		// Clear error while typing, validate on blur
		if (phoneError) setPhoneError(null);
	};

	const handlePhoneBlur = () => {
		if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
			setPhoneError("Phone number must be 9 or 10 digits starting with 0");
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Validate phone before submit
		if (!isValidPhoneNumber(phoneNumber)) {
			setPhoneError("Phone number must be 9 or 10 digits starting with 0");
			return;
		}
		onLogin({ username, password, surveyorName, phoneNumber });
	};

	const isPhoneValid = phoneNumber && isValidPhoneNumber(phoneNumber);
	const isFormValid = username && password && surveyorName && isPhoneValid;

	return (
		<div className="min-h-screen bg-background">
			{/* Header - matching paddy-visit-form header */}
			<header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
				{/* Decorative background elements */}
				<div className="absolute inset-0 opacity-10">
					<div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
					<div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
				</div>

				<div className="relative p-4">
					<div className="flex items-center gap-3">
						<Wheat className="w-8 h-8" />
						<div>
							<h1 className="text-lg font-bold tracking-tight">
								Rice Field Data Collection
							</h1>
							<p className="text-sm text-primary-foreground/70">
								Sign in to continue
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Form Content */}
			<main className="p-4 space-y-4">
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Error Message */}
					{error && (
						<div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
							<span>{error}</span>
						</div>
					)}

					{/* Account Section */}
					<section className="bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
						<div className="px-4 py-3 bg-muted/30 border-b border-border/50">
							<h2 className="font-semibold text-foreground flex items-center gap-2">
								<Lock className="w-4 h-4 text-primary" />
								Account
							</h2>
						</div>
						<div className="p-4 space-y-4">
							{/* Username Field */}
							<div>
								<label
									htmlFor="username"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Username
								</label>
								<div className="relative">
									<User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
									<input
										id="username"
										type="text"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										className="w-full h-12 pl-11 pr-4 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
										placeholder="Enter your username"
										required
										disabled={isLoading}
									/>
								</div>
							</div>

							{/* Password Field */}
							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Password
								</label>
								<div className="relative">
									<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
									<input
										id="password"
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full h-12 pl-11 pr-4 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
										placeholder="Enter your password"
										required
										disabled={isLoading}
									/>
								</div>
							</div>
						</div>
					</section>

					{/* Surveyor Info Section */}
					<section className="bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden">
						<div className="px-4 py-3 bg-muted/30 border-b border-border/50">
							<h2 className="font-semibold text-foreground flex items-center gap-2">
								<UserCircle className="w-4 h-4 text-primary" />
								Surveyor Information
							</h2>
						</div>
						<div className="p-4 space-y-4">
							{/* Surveyor Name Field */}
							<div>
								<label
									htmlFor="surveyorName"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Name
								</label>
								<div className="relative">
									<User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
									<input
										id="surveyorName"
										type="text"
										value={surveyorName}
										onChange={(e) => setSurveyorName(e.target.value)}
										className="w-full h-12 pl-11 pr-4 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
										placeholder="Enter surveyor name"
										required
										disabled={isLoading}
									/>
								</div>
							</div>

							{/* Phone Number Field */}
							<div>
								<label
									htmlFor="phoneNumber"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Phone Number
								</label>
								<div className="relative">
									<Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
									<input
										id="phoneNumber"
										type="tel"
										value={phoneNumber}
										onChange={handlePhoneChange}
										onBlur={handlePhoneBlur}
										className={`w-full h-12 pl-11 pr-4 border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
											phoneError
												? "border-destructive focus:ring-destructive/20 focus:border-destructive"
												: "border-border"
										}`}
										placeholder="012345678"
										required
										disabled={isLoading}
									/>
								</div>
								{/* Phone validation error */}
								{phoneError && (
									<div className="flex items-center gap-1 mt-1.5 text-destructive text-sm">
										<AlertCircle className="w-4 h-4" />
										<span>{phoneError}</span>
									</div>
								)}
							</div>
						</div>
					</section>

					{/* Footer hint */}
					<p className="text-center text-muted-foreground text-sm">
						For best experience, open this app in Telegram
					</p>
				</form>
			</main>

			{/* Fixed Submit Button - matching paddy-visit-form */}
			<div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-50">
				<Button
					type="submit"
					onClick={handleSubmit}
					disabled={isLoading || !isFormValid}
					className="w-full h-14 text-lg rounded-2xl font-bold gap-3 shadow-lg shadow-primary/20"
				>
					{isLoading ? (
						<>
							<Loader2 className="w-6 h-6 animate-spin" />
							Signing in...
						</>
					) : (
						<>
							<LogIn className="w-6 h-6" />
							Sign In
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
