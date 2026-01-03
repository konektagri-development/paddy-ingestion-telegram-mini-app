"use client";

import type React from "react";

interface SectionCardProps {
	icon: React.ElementType;
	title: string;
	description: string;
	children: React.ReactNode;
	id?: string;
}

export function SectionCard({
	icon: Icon,
	title,
	description,
	children,
	id,
}: SectionCardProps) {
	return (
		<div id={id} className="space-y-4">
			<div className="flex items-start gap-4">
				<div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
					<Icon className="w-6 h-6 text-primary" strokeWidth={2.5} />
				</div>
				<div className="space-y-1 pt-1">
					<h3 className="text-xl font-bold text-foreground tracking-tight">
						{title} <span className="text-destructive">*</span>
					</h3>
					<p className="text-base text-muted-foreground leading-relaxed">
						{description}
					</p>
				</div>
			</div>
			<div className="pl-0 md:pl-16">{children}</div>
		</div>
	);
}
