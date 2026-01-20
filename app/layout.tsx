import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import { TelegramProvider } from "@/components/telegram-provider";
import { LanguageProvider } from "@/lib/i18n/language-context";
import "./globals.css";

const notoSans = Noto_Sans({
	variable: "--font-sans",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Rice Field Data Collection",
	description:
		"Telegram Mini App for collecting rice field data during recurring visits",
	applicationName: "Rice Field Data Collector",
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Rice Data",
	},
	formatDetection: {
		telephone: false,
	},
	icons: {
		icon: [
			{ url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
		],
		apple: [
			{ url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
		],
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
	themeColor: "#16a34a",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={notoSans.variable}>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<TelegramProvider>
					<LanguageProvider>{children}</LanguageProvider>
				</TelegramProvider>
			</body>
		</html>
	);
}
