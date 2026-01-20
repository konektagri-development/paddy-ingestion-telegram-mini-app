import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Development ngrok support
	allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],

	// Security: Remove X-Powered-By header
	poweredByHeader: false,

	// Enable compression for smaller responses
	compress: true,

	// Optimize large package imports for smaller bundles
	experimental: {
		optimizePackageImports: ["lucide-react", "exceljs"],
	},
};

export default nextConfig;
