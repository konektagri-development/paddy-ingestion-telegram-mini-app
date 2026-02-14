"use client";

import { Calendar } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface DateInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function DateInput({
	value,
	onChange,
	placeholder = "Select date",
	className,
}: DateInputProps) {
	const { language } = useLanguage();
	const isKhmer = language === "km";
	const dateInputRef = useRef<HTMLInputElement>(null);
	const [displayValue, setDisplayValue] = useState("");
	const [isFocused, setIsFocused] = useState(false);
	const [showKhmerPicker, setShowKhmerPicker] = useState(false);

	// Convert ISO date (YYYY-MM-DD) to display format MM/DD/YYYY
	useEffect(() => {
		if (value && !isFocused) {
			const [year, month, day] = value.split("-");
			setDisplayValue(`${month}/${day}/${year}`);
		} else if (!value) {
			setDisplayValue("");
		}
	}, [value, isFocused]);

	const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value);
	};

	const handleCalendarClick = () => {
		if (isKhmer) {
			// Show Khmer calendar picker
			setShowKhmerPicker(true);
		} else {
			// Show standard date picker
			dateInputRef.current?.showPicker();
		}
	};

	const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const input = e.target.value.replace(/[^\d]/g, ""); // Remove non-digits
		
		let formatted = "";
		
		// Format as MM/DD/YYYY
		if (input.length > 0) {
			formatted = input.slice(0, 2);
			if (input.length >= 2) {
				formatted += "/" + input.slice(2, 4);
			}
			if (input.length >= 4) {
				formatted += "/" + input.slice(4, 8);
			}
		}
		
		setDisplayValue(formatted);
		
		// Convert to ISO when complete (8 digits: MMDDYYYY)
		if (input.length === 8) {
			const month = input.slice(0, 2);
			const day = input.slice(2, 4);
			const year = input.slice(4, 8);
			const isoDate = `${year}-${month}-${day}`;
			onChange(isoDate);
		} else if (formatted === "") {
			onChange("");
		}
	};

	const handleFocus = () => {
		setIsFocused(true);
	};

	const handleBlur = () => {
		setIsFocused(false);
		// Reformat display value if we have a valid date
		if (value) {
			const [year, month, day] = value.split("-");
			setDisplayValue(`${month}/${day}/${year}`);
		}
	};

	const handleKhmerDateSelect = (selectedDate: string) => {
		onChange(selectedDate);
		setShowKhmerPicker(false);
	};

	// Format placeholder and hint based on language
	const formatPlaceholder = isKhmer ? "ខែ/ថ្ងៃ/ឆ្នាំ" : "MM/DD/YYYY";
	

	return (
		<div className="mt-2">
			<div className="relative">
				{/* Hidden date input for standard picker */}
				<input
					ref={dateInputRef}
					type="date"
					value={value}
					onChange={handleDatePickerChange}
					title={isKhmer ? "ជ្រើសរើសកាលបរិច្ឆេទ" : "Select date"}
					aria-label={isKhmer ? "ជ្រើសរើសកាលបរិច្ឆេទ" : "Select date"}
					className="absolute opacity-0 w-0 h-0 pointer-events-none"
				/>
				
				{/* Text input for manual entry and display */}
				<input
					type="text"
					value={displayValue}
					onChange={handleTextInputChange}
					onFocus={handleFocus}
					onBlur={handleBlur}
					placeholder={formatPlaceholder}
					title={isKhmer ? "ជ្រើសរើសកាលបរិច្ឆេទ" : "Select date"}
					maxLength={10}
					className={cn(
						"w-full px-3 py-2 pr-10 text-sm rounded-lg border border-border bg-background",
						"focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
						"transition-all duration-200",
						"placeholder:text-muted-foreground",
						isKhmer && "font-khmer",
						className,
					)}
				/>
				
				{/* Calendar icon button */}
				<button
					type="button"
					onClick={handleCalendarClick}
					className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5rounded-md transition-colors"
					tabIndex={-1}
					title="Open calendar picker"
					aria-label="Open calendar picker"
				>
					<Calendar className="w-4 h-4 text-muted-foreground" />
				</button>
			</div>
			
			{/* Format hint below */}
			<p className={cn(
				"text-xs mt-1 px-1 text-muted-foreground",
				isKhmer && "font-khmer"
			)}>
			
			</p>

			{/* Khmer Calendar Picker Modal */}
			{showKhmerPicker && (
				<KhmerCalendarPicker
					currentValue={value}
					onSelect={handleKhmerDateSelect}
					onClose={() => setShowKhmerPicker(false)}
				/>
			)}
		</div>
	);
}

// Khmer Calendar Picker Component
interface KhmerCalendarPickerProps {
	currentValue: string;
	onSelect: (date: string) => void;
	onClose: () => void;
}

function KhmerCalendarPicker({ currentValue, onSelect, onClose }: KhmerCalendarPickerProps) {
	const [selectedDate, setSelectedDate] = useState<Date>(() => {
		return currentValue ? new Date(currentValue) : new Date();
	});
	const [currentMonth, setCurrentMonth] = useState(() => {
		const date = currentValue ? new Date(currentValue) : new Date();
		return date.getMonth();
	});
	const [currentYear, setCurrentYear] = useState(() => {
		const date = currentValue ? new Date(currentValue) : new Date();
		return date.getFullYear();
	});

	// Khmer month names
	const khmerMonths = [
		"មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
		"កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
	];

	// Khmer day names
	const khmerDays = ["អា", "ច", "អ", "ព", "ព្រ", "សុ", "ស"];

	// Get days in month
	const getDaysInMonth = (month: number, year: number) => {
		return new Date(year, month + 1, 0).getDate();
	};

	// Get first day of month (0 = Sunday)
	const getFirstDayOfMonth = (month: number, year: number) => {
		return new Date(year, month, 1).getDay();
	};

	const handlePrevMonth = () => {
		if (currentMonth === 0) {
			setCurrentMonth(11);
			setCurrentYear(currentYear - 1);
		} else {
			setCurrentMonth(currentMonth - 1);
		}
	};

	const handleNextMonth = () => {
		if (currentMonth === 11) {
			setCurrentMonth(0);
			setCurrentYear(currentYear + 1);
		} else {
			setCurrentMonth(currentMonth + 1);
		}
	};

	const handleDateClick = (day: number) => {
		const date = new Date(currentYear, currentMonth, day);
		setSelectedDate(date);
		const isoDate = date.toISOString().split('T')[0];
		onSelect(isoDate);
	};

	// Generate calendar days
	const daysInMonth = getDaysInMonth(currentMonth, currentYear);
	const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
	const days: (number | null)[] = [];

	// Add empty cells for days before month starts
	for (let i = 0; i < firstDay; i++) {
		days.push(null);
	}

	// Add days of month
	for (let i = 1; i <= daysInMonth; i++) {
		days.push(i);
	}

	return (
		<>
			{/* Backdrop */}
			<div 
				className="fixed inset-0 bg-black/50 z-50"
				onClick={onClose}
			/>
			
			{/* Calendar Modal */}
			<div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background rounded-lg shadow-lg border border-border p-4 w-80">
				{/* Header */}
				<div className="flex items-center justify-between mb-4">
					<button
						onClick={handlePrevMonth}
						className="p-1 hover:bg-muted rounded"
					>
						<span className="text-lg">‹</span>
					</button>
					
					<div className="text-center font-khmer">
						<div className="font-semibold">{khmerMonths[currentMonth]}</div>
						<div className="text-sm text-muted-foreground">{currentYear}</div>
					</div>
					
					<button
						onClick={handleNextMonth}
						className="p-1 hover:bg-muted rounded"
					>
						<span className="text-lg">›</span>
					</button>
				</div>

				{/* Day names */}
				<div className="grid grid-cols-7 gap-1 mb-2">
					{khmerDays.map((day, index) => (
						<div key={index} className="text-center text-xs font-khmer text-muted-foreground py-1">
							{day}
						</div>
					))}
				</div>

				{/* Calendar days */}
				<div className="grid grid-cols-7 gap-1">
					{days.map((day, index) => {
						if (day === null) {
							return <div key={index} />;
						}

						const isSelected = selectedDate?.getDate() === day &&
							selectedDate?.getMonth() === currentMonth &&
							selectedDate?.getFullYear() === currentYear;

						const isToday = new Date().getDate() === day &&
							new Date().getMonth() === currentMonth &&
							new Date().getFullYear() === currentYear;

						return (
							<button
								key={index}
								onClick={() => handleDateClick(day)}
								className={cn(
									"aspect-square flex items-center justify-center text-sm rounded-md transition-colors",
									"hover:bg-muted",
									isSelected && "bg-primary text-primary-foreground hover:bg-primary",
									isToday && !isSelected && "border border-primary",
								)}
							>
								{day}
							</button>
						);
					})}
				</div>

				{/* Close button */}
				<button
					onClick={onClose}
					className="w-full mt-4 px-4 py-2 bg-muted hover:bg-muted/80 rounded-md text-sm font-khmer transition-colors"
				>
					បិទ
				</button>
			</div>
		</>
	);
}