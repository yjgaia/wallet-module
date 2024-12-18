import { EventContainer } from "@common-module/ts";
import { createWeb3Modal, defaultConfig, Web3Modal } from "@web3modal/ethers";
import { BrowserProvider, getAddress, toBeHex } from "ethers";
import WalletConnector, {
  ChainInfo,
  WalletConnectorOptions,
} from "./WalletConnector.js";

export interface WalletConnectConnectorOptions extends WalletConnectorOptions {
  description: string;
  walletConnectProjectId: string;
}

class WalletConnectConnector extends EventContainer<{
  addressChanged: (address: string | undefined) => void;
}> implements WalletConnector {
  private _web3Modal: Web3Modal | undefined;

  private get web3Modal() {
    if (!this._web3Modal) throw new Error("Web3Modal not initialized");
    return this._web3Modal;
  }

  public displayMode: "modal" = "modal";
  public connectedProvider: BrowserProvider | undefined;

  private resolveConnection: (() => void) | undefined;
  private rejectConnection: ((error: Error) => void) | undefined;

  public init(options: WalletConnectConnectorOptions) {
    this._web3Modal = createWeb3Modal({
      projectId: options.walletConnectProjectId,
      ethersConfig: defaultConfig({
        metadata: {
          name: options.name,
          description: options.description,
          url: window.location.origin,
          icons: [options.icon],
        },
      }),
      chains: Object.entries(options.chains).map(([name, info]) => ({
        chainId: info.id,
        name,
        currency: info.symbol,
        rpcUrl: info.rpc,
        explorerUrl: info.explorerUrl,
      })),
      themeVariables: {
        "--w3m-z-index": 999999,
      },
    });

    this._web3Modal.subscribeEvents((newEvent) => {
      if (newEvent.data.event === "MODAL_CLOSE" && this.rejectConnection) {
        this.rejectConnection(new Error("User closed WalletConnect modal"));
        this.rejectConnection = undefined;
        this.resolveConnection = undefined;
      }
    });

    let cachedAddress = this._web3Modal.getAddress();
    this._web3Modal.subscribeProvider((newState) => {
      if (newState.address && this.resolveConnection) {
        this.resolveConnection();
        this.rejectConnection = undefined;
        this.resolveConnection = undefined;
      }
      if (cachedAddress !== newState.address) {
        this.emit(
          "addressChanged",
          newState.address ? getAddress(newState.address) : undefined,
        );
        cachedAddress = newState.address;
      }
    });
  }

  public async connect() {
    let walletAddress = this.web3Modal.getAddress();

    if (walletAddress !== undefined) {
      walletAddress = getAddress(walletAddress);
      this.emit("addressChanged", walletAddress);
    } else {
      await new Promise<void>((resolve, reject) => {
        this.resolveConnection = resolve;
        this.rejectConnection = reject;
        this._web3Modal?.open();
      });

      walletAddress = this.web3Modal.getAddress();
      if (walletAddress !== undefined) {
        walletAddress = getAddress(walletAddress);
      }
    }

    const walletProvider = this.web3Modal.getWalletProvider();
    if (!walletProvider) throw new Error("Wallet provider not found");

    this.connectedProvider = new BrowserProvider(walletProvider);

    return walletAddress;
  }

  public async disconnect() {
    await this._web3Modal?.disconnect();
  }

  public async addChain(chain: ChainInfo) {
    const walletProvider = this.web3Modal.getWalletProvider();
    if (!walletProvider) throw new Error("Wallet provider not found");

    await walletProvider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: toBeHex(chain.id).replace(/^0x0+/, "0x"),
          chainName: chain.name,
          blockExplorerUrls: [chain.explorerUrl],
          nativeCurrency: { symbol: chain.symbol, decimals: 18 },
          rpcUrls: [chain.rpc],
        },
      ],
    });
  }

  public async switchChain(chain: ChainInfo) {
    const walletProvider = this.web3Modal.getWalletProvider();
    if (!walletProvider) throw new Error("Wallet provider not found");

    await walletProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: toBeHex(chain.id).replace(/^0x0+/, "0x") }],
    });
  }
}

export default new WalletConnectConnector();
