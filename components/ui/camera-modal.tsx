"use client";

import { Camera, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CameraModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCapture: (file: File) => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [facingMode] = useState<"environment" | "user">("environment");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [useFallback, setUseFallback] = useState(false);

	const startCamera = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		setUseFallback(false);

		// Stop existing stream
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => {
				track.stop();
			});
		}

		// Check if MediaDevices is available (requires HTTPS)
		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			console.log("MediaDevices not available, using fallback");
			setUseFallback(true);
			setIsLoading(false);
			// Trigger file input automatically
			setTimeout(() => {
				fileInputRef.current?.click();
			}, 100);
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: facingMode,
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				},
				audio: false,
			});

			streamRef.current = stream;

			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
			}
			setIsLoading(false);
		} catch (err) {
			console.error("Camera error:", err);
			// Fall back to file input
			setUseFallback(true);
			setIsLoading(false);
			// Trigger file input automatically
			setTimeout(() => {
				fileInputRef.current?.click();
			}, 100);
		}
	}, [facingMode]);

	const stopCamera = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => {
				track.stop();
			});
			streamRef.current = null;
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
	}, []);

	useEffect(() => {
		if (isOpen) {
			startCamera();
		} else {
			stopCamera();
			setUseFallback(false);
			setError(null);
		}

		return () => {
			stopCamera();
		};
	}, [isOpen, startCamera, stopCamera]);

	const handleCapture = () => {
		if (!videoRef.current || !canvasRef.current) return;

		const video = videoRef.current;
		const canvas = canvasRef.current;

		// Set canvas dimensions to match video
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Draw the current video frame to canvas
		ctx.drawImage(video, 0, 0);

		// Convert canvas to blob
		canvas.toBlob(
			(blob) => {
				if (blob) {
					const file = new File([blob], `photo-${Date.now()}.jpg`, {
						type: "image/jpeg",
					});
					onCapture(file);
					onClose();
				}
			},
			"image/jpeg",
			0.9,
		);
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			onCapture(file);
		}
		onClose();
		// Reset input
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleFallbackClose = () => {
		// Reset input when closing via fallback
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
		onClose();
	};

	if (!isOpen) return null;

	// Fallback mode - just show a hidden file input that auto-triggers
	if (useFallback) {
		return (
			<>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					capture="environment"
					onChange={handleFileInputChange}
					className="hidden"
				/>
				{/* Transparent overlay that closes on click */}
				<div
					role="button"
					tabIndex={0}
					className="fixed inset-0 z-50 bg-black/50"
					onClick={handleFallbackClose}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							handleFallbackClose();
						}
					}}
				/>
			</>
		);
	}

	return (
		<div
			className="fixed inset-0 z-[9999] bg-black"
			style={{ height: "100dvh", width: "100vw", top: 0, left: 0 }}
		>
			{/* Hidden canvas for capturing */}
			<canvas ref={canvasRef} className="hidden" />

			{/* Hidden file input for fallback */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				capture="environment"
				onChange={handleFileInputChange}
				className="hidden"
			/>

			{/* Video preview */}
			<video
				ref={videoRef}
				autoPlay
				playsInline
				muted
				className={cn(
					"w-full h-full object-cover",
					facingMode === "user" && "scale-x-[-1]",
				)}
			/>

			{/* Loading overlay */}
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/80">
					<div className="text-white text-center">
						<div className="animate-spin rounded-full h-10 w-10 border-2 border-white border-t-transparent mx-auto mb-2" />
						<p>Opening camera...</p>
					</div>
				</div>
			)}

			{/* Error overlay */}
			{error && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
					<div className="text-white text-center">
						<p className="mb-4">{error}</p>
						<Button variant="outline" onClick={onClose}>
							Close
						</Button>
					</div>
				</div>
			)}

			{/* Controls */}
			{!isLoading && !error && (
				<>
					{/* Close button */}
					<Button
						size="icon"
						variant="ghost"
						onClick={onClose}
						className="absolute top-4 left-4 w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70"
					>
						<X className="w-6 h-6" />
					</Button>

					{/* Capture button */}
					<div className="absolute bottom-8 left-0 right-0 flex justify-center">
						<Button
							size="icon"
							onClick={handleCapture}
							className="w-20 h-20 rounded-full bg-white hover:bg-gray-200 border-4 border-gray-300"
						>
							<Camera className="w-16 h-16 text-black" />
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
