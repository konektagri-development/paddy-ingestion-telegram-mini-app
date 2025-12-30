"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "../telegram-provider";

interface Option {
	value: string;
	label: string;
	description?: string;
}

interface CheckboxGroupProps {
	options: readonly Option[] | Option[];
	value: string | string[] | null;
	onChange: (value: string | string[]) => void;
	multiple?: boolean;
	name?: string;
	className?: string;
}

export function CheckboxGroup({
	options,
	value,
	onChange,
	multiple = false,
	name: _name,
	className,
}: CheckboxGroupProps) {
	const handleSelect = (optionValue: string) => {
		triggerHaptic("light");

		if (multiple) {
			const currentValues = Array.isArray(value) ? value : [];
			const newValues = currentValues.includes(optionValue)
				? currentValues.filter((v) => v !== optionValue)
				: [...currentValues, optionValue];
			onChange(newValues);
		} else {
			onChange(optionValue);
		}
	};

	const isSelected = (optionValue: string) => {
		if (multiple) {
			return Array.isArray(value) && value.includes(optionValue);
		}
		return value === optionValue;
	};

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => handleSelect(option.value)}
					className={cn(
						"flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left",
						isSelected(option.value)
							? "border-primary bg-primary/5"
							: "border-border hover:border-primary/50 hover:bg-muted/50",
					)}
				>
					<div
						className={cn(
							"w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-all",
							multiple ? "rounded" : "rounded-full",
							isSelected(option.value)
								? "border-primary bg-primary"
								: "border-muted-foreground/30",
						)}
					>
						{isSelected(option.value) && (
							<Check
								className="w-3 h-3 text-primary-foreground"
								strokeWidth={3}
							/>
						)}
					</div>
					<div className="flex-1 min-w-0">
						<span
							className={cn(
								"font-medium text-sm",
								isSelected(option.value) ? "text-primary" : "text-foreground",
							)}
						>
							{option.label}
						</span>
						{option.description && (
							<p className="text-xs text-muted-foreground mt-0.5">
								{option.description}
							</p>
						)}
					</div>
				</button>
			))}
		</div>
	);
}
