import { NextRequest, NextResponse } from "next/server";

// Single admin credential for web login (from env)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Simple token generation (no expiration)
function generateToken(surveyorName: string, phoneNumber: string): string {
	const payload = {
		surveyorName,
		phoneNumber,
		createdAt: Date.now(),
	};
	return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { username, password, surveyorName, phoneNumber } = body;

		// Validate required fields
		if (!username || !password) {
			return NextResponse.json(
				{ success: false, message: "Username and password are required" },
				{ status: 400 },
			);
		}

		if (!surveyorName || !phoneNumber) {
			return NextResponse.json(
				{
					success: false,
					message: "Surveyor name and phone number are required",
				},
				{ status: 400 },
			);
		}

		if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
			return NextResponse.json(
				{ success: false, message: "Admin credentials are not configured" },
				{ status: 500 },
			);
		}

		// Check admin credentials
		if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
			return NextResponse.json(
				{ success: false, message: "Invalid username or password" },
				{ status: 401 },
			);
		}

		// Generate token with surveyor info (no expiration)
		const token = generateToken(surveyorName, phoneNumber);

		return NextResponse.json({
			success: true,
			message: "Login successful",
			token,
			user: {
				surveyorName,
				phoneNumber,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ success: false, message: "Login failed" },
			{ status: 500 },
		);
	}
}
