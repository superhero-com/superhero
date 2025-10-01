import { ethers, Contract } from 'ethers';

export const isAddressValid = (address: string) => ethers.isAddress(address);

export { Contract };


