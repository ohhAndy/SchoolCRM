"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
    return (
        <Button variant="outline" onClick={() => (typeof window !== "undefined" ? window.print() : undefined)}>
            Print
        </Button>
    );
}