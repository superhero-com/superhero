import React from "react";
import MobileCard from "@/components/MobileCard";
import AeButton from "@/components/AeButton";
import { useAtom } from "jotai";
import { bidAtom, positionAtom, transformedImageAtom } from "../state/atoms";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ToastProvider";
import { useAeSdk } from "@/hooks/useAeSdk";
import configs from "@/configs";
import { placeBid } from "../services/graffitiService";

export default function GraffitiConfirm() {
  const navigate = useNavigate();
  const [transformed] = useAtom(transformedImageAtom);
  const [position] = useAtom(positionAtom);
  const { push } = useToast();
  const { sdk, activeNetwork } = useAeSdk();
  const [bid] = useAtom(bidAtom);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Your Bid</h1>
      <MobileCard padding="large">
        <div className="space-y-3">
          <div className="text-sm opacity-70">Required Time</div>
          <div className="text-xl">{Math.max(1, transformed.dronetime)} Minutes</div>
          <div className="text-sm opacity-70">Position</div>
          <div className="text-sm">x: {position.x}, y: {position.y}</div>
          <div className="pt-2 flex gap-3">
            <AeButton onClick={async () => {
              try {
                if (!sdk) { push('Wallet not connected'); return; }
                if (!transformed.src) { push('Missing rendered image'); return; }
                if (!bid.amountAe || !bid.slotId) { push('Select slot and amount first'); return; }
                const contractAddress = (configs.networks as any)[activeNetwork.networkId]?.graffitiContract || configs.networks.ae_uat?.graffitiContract || '';
                if (!contractAddress) { push('Graffiti contract not configured'); return; }
                await placeBid({
                  sdk,
                  contractAddress,
                  slotId: bid.slotId,
                  timeMinutes: Math.max(1, transformed.dronetime),
                  imageSvgDataUrl: transformed.src,
                  pos: position,
                  amountAe: bid.amountAe,
                  network: activeNetwork,
                });
                push('Bid placed successfully');
                navigate('/graffiti/overview');
              } catch (e: any) {
                console.error(e);
                push('Failed to place bid');
              }
            }}>Place Bid</AeButton>
            <AeButton variant="secondary" onClick={() => navigate('/graffiti/positioning')}>Back</AeButton>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}


