import axios from 'axios';
import { AeSdk } from '@aeternity/aepp-sdk';
import { INetwork } from '@/utils/types';
import configs from '@/configs';
import GraffitiAuctionACI from '@/api/GraffitiAuctionACI.json';

export type PlaceBidParams = {
  sdk: AeSdk;
  contractAddress: string;
  slotId: number;
  timeMinutes: number;
  imageSvgDataUrl: string; // data:image/svg+xml;base64,...
  pos: { x: number; y: number };
  amountAe: number; // AE
  network: INetwork;
};

export async function uploadImageToBackend(imageSvgDataUrl: string, network: INetwork): Promise<string> {
  const blob = await (await fetch(imageSvgDataUrl)).blob();
  const data = new FormData();
  data.append('image', blob, 'art.svg');
  const url = `${configs.networks[network.networkId].superheroBackendUrl || configs.networks.ae_uat.superheroBackendUrl}/upload`;
  const response = await axios.post(url, data, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data.hash as string; // ipfs hash
}

export async function placeBid({ sdk, contractAddress, slotId, timeMinutes, imageSvgDataUrl, pos, amountAe, network }: PlaceBidParams) {
  const ipfsHash = await uploadImageToBackend(imageSvgDataUrl, network);
  const contract = await (sdk as any).initializeContract({ aci: GraffitiAuctionACI, address: contractAddress });
  const amountAettos = BigInt(Math.round(amountAe * 1e18));
  const res = await contract.place_bid(slotId, Math.round(timeMinutes), ipfsHash, pos.x, pos.y, { amount: amountAettos.toString(), gas: 300000 });
  return res;
}
