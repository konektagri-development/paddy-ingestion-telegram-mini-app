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
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
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
