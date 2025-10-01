import { RecentActivity } from "@/components/dex";
import { AeEthBridge } from "../components/AeEthBridge";

export default function Bridge() {
    return (
        <div className="mx-auto md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
            {/* Main Content - unified layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[480px_minmax(560px,1fr)] gap-6 md:gap-8 items-start w-full">
                {/* Left card (Swap) */}
                <div className="order-1 lg:order-1">
                    <AeEthBridge />
                </div>

                {/* Right column (Chart + Recent Activity) */}
                <div className="order-2 lg:order-2 w-full min-w-0 flex flex-col gap-6">
                    <RecentActivity />
                </div>
            </div>
            {/* New Account Education hidden on DEX */}
        </div>
    );
}   