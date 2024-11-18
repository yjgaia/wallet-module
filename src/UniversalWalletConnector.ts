import {
  Config,
  createConfig,
  disconnect,
  getAccount,
  getBalance,
  http,
  readContract,
  ReadContractParameters,
  reconnect,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
  WriteContractParameters,
} from "@wagmi/core";
import {
  type Abi,
  type ContractFunctionArgs,
  type ContractFunctionName,
} from "viem";
import CoinbaseWalletConnector from "./wallet-connectors/CoinbaseWalletConnector.js";
import InjectedWalletConnector, {
  InjectedWalletInfo,
} from "./wallet-connectors/InjectedWalletConnector.js";
import MetaMaskConnector from "./wallet-connectors/MetaMaskConnector.js";
import WalletConnectConnector from "./wallet-connectors/WalletConnectConnector.js";
import WalletConnector from "./wallet-connectors/WalletConnector.js";
import WalletModuleConfig from "./WalletModuleConfig.js";

class UniversalWalletConnector {
  private _config?: Config;
  protected get config() {
    if (!this._config) throw new Error("Config not initialized");
    return this._config;
  }
  protected set config(config: Config) {
    this._config = config;
  }

  public connectors: WalletConnector[] = [
    MetaMaskConnector,
    CoinbaseWalletConnector,
    WalletConnectConnector,
  ];

  public init(walletId?: string) {
    this.config = createConfig({
      chains: WalletModuleConfig.chains,
      transports: Object.fromEntries(
        WalletModuleConfig.chains.map((chain) => [chain.id, http()]),
      ),
    });

    for (const connector of this.connectors) {
      connector.init(this.config);

      if (connector.walletId === walletId) {
        reconnect(this.config, { connectors: [connector.wagmiConnector] });
      }
    }

    window.addEventListener(
      "eip6963:announceProvider",
      (event: any) => {
        const walletInfo: InjectedWalletInfo | undefined = event.detail.info;
        const provider = event.detail.provider;
        if (walletInfo && provider) {
          const connector = new InjectedWalletConnector(walletInfo, provider);
          this.connectors.unshift(connector);

          connector.init(this.config);

          if (connector.walletId === walletId) {
            reconnect(this.config, { connectors: [connector.wagmiConnector] });
          }
        }
      },
    );
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  }

  public disconnect() {
    disconnect(this.config);
  }

  public getChainId() {
    return getAccount(this.config).chainId;
  }

  public switchChain(chainId: number) {
    switchChain(this.config, { chainId });
  }

  public getAddress() {
    return getAccount(this.config).address;
  }

  public async getBalance(chainId: number, walletAddress: `0x${string}`) {
    return (await getBalance(this.config, { chainId, address: walletAddress }))
      .value;
  }

  public async readContract<
    const abi extends Abi | readonly unknown[],
    functionName extends ContractFunctionName<abi, "pure" | "view">,
    args extends ContractFunctionArgs<abi, "pure" | "view", functionName>,
  >(parameters: ReadContractParameters<abi, functionName, args, Config>) {
    return await readContract(this.config, parameters);
  }

  public async writeContract<
    const abi extends Abi | readonly unknown[],
    functionName extends ContractFunctionName<abi, "nonpayable" | "payable">,
    args extends ContractFunctionArgs<
      abi,
      "nonpayable" | "payable",
      functionName
    >,
    chainId extends Config["chains"][number]["id"],
  >(
    parameters: WriteContractParameters<
      abi,
      functionName,
      args,
      Config,
      chainId
    >,
  ) {
    const hash = await writeContract(this.config, parameters);
    const receipt = await waitForTransactionReceipt(this.config, { hash });
    console.log(receipt);
  }
}

export default new UniversalWalletConnector();
