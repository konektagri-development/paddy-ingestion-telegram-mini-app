"use client";

import { Camera, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { triggerHaptic } from "@/components/telegram-provider";
import { Button } from "@/components/ui/button";
import { CameraModal } from "@/components/ui/camera-modal";
import type { PhotoData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { compressImage } from "@/lib/image-compression";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
	photos: PhotoData[];
	onPhotosChange: (photos: PhotoData[]) => void;
	maxPhotos?: number;
	className?: string;
}

export function PhotoUpload({
	photos,
	onPhotosChange,
	maxPhotos = 10,
	className,
}: PhotoUploadProps) {
	const { t } = useLanguage();
	const [isCameraOpen, setIsCameraOpen] = useState(false);
	const [isCompressing, setIsCompressing] = useState(false);
	const uploadRef = useRef<HTMLInputElement>(null);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;

		triggerHaptic("light");
		setIsCompressing(true);

		try {
			// Compress files before adding
			const filesToProcess = files.slice(0, maxPhotos - photos.length);
			const compressedFiles = await Promise.all(
				filesToProcess.map((file) => compressImage(file)),
			);

			const newPhotos: PhotoData[] = compressedFiles.map((file, index) => ({
				id: `photo-${Date.now()}-${index}`,
				file,
				preview: URL.createObjectURL(file),
				type: photos.length === 0 ? "farm" : "soil",
			}));

			onPhotosChange([...photos, ...newPhotos]);
		} finally {
			setIsCompressing(false);
		}

		// Reset input
		if (uploadRef.current) uploadRef.current.value = "";
	};

	const handleCameraCapture = async (file: File) => {
		triggerHaptic("light");
		setIsCompressing(true);

		try {
			// Compress camera capture
			const compressedFile = await compressImage(file);

			const newPhoto: PhotoData = {
				id: `photo-${Date.now()}`,
				file: compressedFile,
				preview: URL.createObjectURL(compressedFile),
				type: photos.length === 0 ? "farm" : "soil",
			};

			onPhotosChange([...photos, newPhoto]);
		} finally {
			setIsCompressing(false);
		}
	};

	const handleTakePhoto = () => {
		triggerHaptic("light");
		setIsCameraOpen(true);
	};

	const handleUploadPhoto = () => {
		triggerHaptic("light");
		uploadRef.current?.click();
	};

	const handleRemove = (id: string) => {
		triggerHaptic("light");
		const photoToRemove = photos.find((p) => p.id === id);
		if (photoToRemove?.preview) {
			URL.revokeObjectURL(photoToRemove.preview);
		}
		onPhotosChange(photos.filter((p) => p.id !== id));
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* Camera Modal */}
			<CameraModal
				isOpen={isCameraOpen}
				onClose={() => setIsCameraOpen(false)}
				onCapture={handleCameraCapture}
			/>

			{/* Hidden file input for upload */}
			<input
				ref={uploadRef}
				type="file"
				accept="image/*"
				multiple
				onChange={handleFileChange}
				className="hidden"
			/>

			{/* Photo Grid */}
			{photos.length > 0 && (
				<div className="grid grid-cols-2 gap-3">
					{photos.map((photo) => (
						<div
							key={photo.id}
							className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted"
						>
							<Image
								src={photo.preview}
								alt="Field capture"
								fill
								className="object-cover"
								unoptimized
							/>

							{/* Remove button */}
							<button
								type="button"
								onClick={() => handleRemove(photo.id)}
								className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center shadow-md"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Action Buttons */}
			{photos.length < maxPhotos && (
				<div className="grid grid-cols-2 gap-3">
					<Button
						variant="ghost"
						onClick={handleTakePhoto}
						disabled={isCompressing}
						className={cn(
							"flex flex-col items-center justify-center gap-2 h-auto p-4 rounded-xl",
							"border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10",
						)}
					>
						<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
							<Camera className="w-5 h-5 text-primary" />
						</div>
						<span className="text-sm font-medium text-primary">
							{t.sections.photos.takePhoto}
						</span>
					</Button>

					<Button
						variant="ghost"
						onClick={handleUploadPhoto}
						disabled={isCompressing}
						className={cn(
							"flex flex-col items-center justify-center gap-2 h-auto p-4 rounded-xl",
							"border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50",
						)}
					>
						<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
							<Upload className="w-5 h-5 text-muted-foreground" />
						</div>
						<span className="text-sm font-medium text-muted-foreground">
							{isCompressing ? "Compressing..." : t.sections.photos.uploadPhoto}
						</span>
					</Button>
				</div>
			)}

			{/* Count */}
			<p className="text-xs text-center text-muted-foreground">
				{photos.length}/{maxPhotos} {t.sections.photos.photosUploaded}
			</p>
		</div>
	);
}
