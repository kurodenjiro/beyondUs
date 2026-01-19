import { ManageLayers } from "@/components/editor/ManageLayers";
import { Suspense } from "react";

export default function OrganizePage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <Suspense fallback={<div>Loading editor...</div>}>
                <ManageLayers />
            </Suspense>
        </div>
    );
}
