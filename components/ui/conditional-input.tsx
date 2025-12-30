"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ConditionalInputProps {
	show: boolean;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

import { Input } from "@/components/ui/input";

export function ConditionalInput({
	show,
	value,
	onChange,
	placeholder = "Please specify...",
	className,
}: ConditionalInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (show && inputRef.current) {
			setTimeout(() => {
				inputRef.current?.focus();
			}, 200);
		}
	}, [show]);

	return (
		<div
			className={cn(
				"overflow-hidden transition-all duration-300 ease-out",
				show ? "max-h-20 opacity-100 mt-2" : "max-h-0 opacity-0",
			)}
		>
			<Input
				ref={inputRef}
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn("bg-background", className)}
			/>
		</div>
	);
}
