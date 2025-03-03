### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

## General Flow

1. Deploy the Token Contract first
2. Deploy the TimeLock controller.
3. Deploy the Governance contract.

Use this command to run the deployment script as well as verify it.
```bash
forge script script/DeployProtocol.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --verify --etherscan-api-key $ARBISCAN --broadcast
```


### DEPLOYMENT SUMMARY
  -------------------
  | Parameter            | Value                                         |
|----------------------|---------------------------------------------|
| **GovernanceToken**  | `0xA841bC127eEf5C9816bf2B53FB032a9C1C8BB3dd` |
| **TimelockController** | `0x1838BB5E7C8351A1d3C3b876130F0F7C840b263E` |
| **Governance**       | `0xCBa39Ff71E9c086230378576ead5c8dE5cF52F91` |
| **Voting Delay**     | 7200 blocks                                  |
| **Voting Period**    | 50400 blocks                                 |
| **Proposal Threshold** | 0                                         |
| **Quorum Fraction**  | 4%                                          |
| **Timelock Delay**   | 86400 seconds                               |
