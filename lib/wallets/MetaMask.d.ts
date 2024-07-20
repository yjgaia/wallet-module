import { BrowserProvider } from "ethers";
import ChainInfo from "../ChainInfo.js";
import Wallet from "./Wallet.js";
declare class MetaMask implements Wallet {
    private chains;
    private metaMaskSdk;
    private eip1193Provider;
    init(options: {
        name: string;
        icon: string;
        chains: {
            [name: string]: ChainInfo;
        };
    }): void;
    connect(): Promise<BrowserProvider>;
    disconnect(): Promise<void>;
    switchChain(chainId: number): Promise<void>;
}
declare const _default: MetaMask;
export default _default;
//# sourceMappingURL=MetaMask.d.ts.map