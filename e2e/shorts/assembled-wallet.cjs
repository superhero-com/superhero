// SDK wallet protocol fixture for the real App. Fresh test keys only; every
// transaction signing/broadcast path is denied. Creator API signatures are real.
exports.walletModule = `
import {AeSdkWallet, AccountMemory, Node, BrowserWindowMessageConnection, RpcRejectedByUserError} from '@aeternity/aepp-sdk';
const state = window.__ownedWalletState = {connected: 0, signed: 0, transactions: 0, reject: false, hold: false};
const accounts = window.__ownedWalletKeys.map(key => new AccountMemory(key));
delete window.__ownedWalletKeys;
for (const account of accounts) {
  const sign = account.signMessage.bind(account);
  account.signMessage = async (...args) => {
    state.signed++;
    if (state.hold) await new Promise(resolve => { state.release = resolve; });
    if (state.reject) throw new RpcRejectedByUserError();
    return sign(...args);
  };
  account.signTransaction = async () => { state.transactions++; throw new Error('Fixture wallet forbids transactions'); };
}
const wallet = new AeSdkWallet({id:'owned-shorts-wallet',name:'Owned Shorts wallet',type:'extension',
  accounts,nodes:[{name:'testnet',instance:new Node('https://testnet.aeternity.io')}],
  onConnection:()=>{state.connected++;},onSubscription:()=>{},onAskAccounts:()=>{},onAskToSelectNetwork:()=>{},onDisconnect:()=>{},
});
wallet.sendTransaction = async () => { state.transactions++; throw new Error('Fixture wallet forbids broadcasts'); };
wallet.selectAccount(accounts[Number(sessionStorage.getItem('owned-wallet-index') || 0)].address);
const connection = new BrowserWindowMessageConnection({target:window,origin:location.origin,sendDirection:'to_aepp',receiveDirection:'to_waellet'});
const client = wallet.addRpcClient(connection);
const announce = () => { if (wallet._clients.has(client)) wallet.shareWalletInfo(client).catch(error => { state.error=error.message; }); };
const timer=setInterval(announce,150); announce();
state.select = index => { sessionStorage.setItem('owned-wallet-index',String(index));wallet.selectAccount(accounts[index].address); };
state.ready = true;
window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
`;
