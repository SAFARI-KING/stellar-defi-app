import React, { useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Box,
  CircularProgress,
  Link,
  Container,
  Divider,
} from "@mui/material";
import {
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  Asset,
  Operation,
  LiquidityPoolAsset,
  getLiquidityPoolId,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";

const server = new SorobanRpc.Server("https://soroban-testnet.stellar.org");

function App() {
  const [keypair, setKeypair] = useState(null);
  const [log, setLog] = useState("");
  const [liquidityPoolId, setLiquidityPoolId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [tokenAAmount, setTokenAAmount] = useState("");
  const [tokenBAmount, setTokenBAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState({
    generateKeypair: false,
    fundAccount: false,
    createLiquidityPool: false,
    withdrawFromPool: false,
  });

  const addLog = (message) => {
    setLog(message);
  };

  const generateKeypair = () => {
    setLoading((prev) => ({ ...prev, generateKeypair: true }));
    const newKeypair = Keypair.random();
    setKeypair(newKeypair);
    addLog(`Generated new keypair. Public key: ${newKeypair.publicKey()}`);
    setLoading((prev) => ({ ...prev, generateKeypair: false }));
  };

  const fundAccount = async () => {
    if (!keypair) {
      addLog("Please generate a keypair first.");
      return;
    }

    setLoading((prev) => ({ ...prev, fundAccount: true }));
    const friendbotUrl = `https://friendbot.stellar.org?addr=${keypair.publicKey()}`;
    try {
      const response = await fetch(friendbotUrl);
      if (response.ok) {
        addLog(`Account ${keypair.publicKey()} successfully funded.`);
      } else {
        addLog(`Something went wrong funding account: ${keypair.publicKey()}.`);
      }
    } catch (error) {
      addLog(`Error funding account ${keypair.publicKey()}: ${error.message}`);
    }
    setLoading((prev) => ({ ...prev, fundAccount: false }));
  };

  const createLiquidityPool = async () => {
    if (!keypair || !assetName || !tokenAAmount || !tokenBAmount) {
      addLog(
        "Please ensure you have a keypair, asset name, and token amounts."
      );
      return;
    }

    setLoading((prev) => ({ ...prev, createLiquidityPool: true }));
    try {
      const account = await server.getAccount(keypair.publicKey());
      const customAsset = new Asset(assetName, keypair.publicKey());
      const lpAsset = new LiquidityPoolAsset(Asset.native(), customAsset, 30);
      const lpId = getLiquidityPoolId("constant_product", lpAsset).toString(
        "hex"
      );
      setLiquidityPoolId(lpId);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.changeTrust({ asset: lpAsset }))
        .addOperation(
          Operation.liquidityPoolDeposit({
            liquidityPoolId: lpId,
            maxAmountA: tokenAAmount,
            maxAmountB: tokenBAmount,
            minPrice: { n: 1, d: 1 },
            maxPrice: { n: 1, d: 1 },
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      const result = await server.sendTransaction(transaction);
      addLog(
        <>
          Liquidity Pool created. Transaction URL:{" "}
          <Link
            href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            color="secondary"
          >
            View Transaction
          </Link>
        </>
      );
    } catch (error) {
      addLog(`Error creating Liquidity Pool: ${error.message}`);
    }
    setLoading((prev) => ({ ...prev, createLiquidityPool: false }));
  };

  const withdrawFromPool = async () => {
    if (!keypair || !liquidityPoolId || !withdrawAmount) {
      addLog(
        "Please ensure you have a keypair, liquidity pool ID, and withdrawal amount."
      );
      return;
    }

    setLoading((prev) => ({ ...prev, withdrawFromPool: true }));
    try {
      const account = await server.getAccount(keypair.publicKey());
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.liquidityPoolWithdraw({
            liquidityPoolId: liquidityPoolId,
            amount: withdrawAmount,
            minAmountA: "0",
            minAmountB: "0",
          })
        )
        .setTimeout(30)
        .build();

      transaction.sign(keypair);
      const result = await server.sendTransaction(transaction);
      addLog(
        <>
          Withdrawal successful. Transaction URL:{" "}
          <Link
            href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            color="secondary"
          >
            View Transaction
          </Link>
        </>
      );
    } catch (error) {
      addLog(`Error withdrawing from Liquidity Pool: ${error.message}`);
    }
    setLoading((prev) => ({ ...prev, withdrawFromPool: false }));
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 4,
          bgcolor: "beige",
          borderRadius: 2,
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: "#1a237e",
            fontWeight: "600",
            textAlign: "center",
            mb: 3,
          }}
        >
          DeFi Liquidity Pool
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Button
              variant="contained"
              sx={{
                bgcolor: "#1a73e8",
                color: "#fff",
                mb: 2,
              }}
              onClick={generateKeypair}
              fullWidth
              disabled={loading.generateKeypair}
            >
              {loading.generateKeypair ? (
                <CircularProgress size={24} />
              ) : (
                "Generate Keypair"
              )}
            </Button>
            <Button
              variant="outlined"
              sx={{ color: "#1a73e8", borderColor: "#1a73e8", mb: 2 }}
              onClick={fundAccount}
              fullWidth
              disabled={loading.fundAccount}
            >
              {loading.fundAccount ? (
                <CircularProgress size={24} />
              ) : (
                "Fund Account"
              )}
            </Button>
            <TextField
              label="Asset Name"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              fullWidth
              margin="normal"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Token A Amount (XLM)"
              value={tokenAAmount}
              onChange={(e) => setTokenAAmount(e.target.value)}
              fullWidth
              margin="normal"
              type="number"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Token B Amount (Custom Asset)"
              value={tokenBAmount}
              onChange={(e) => setTokenBAmount(e.target.value)}
              fullWidth
              margin="normal"
              type="number"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              sx={{
                bgcolor: "#388e3c",
                color: "#fff",
                mb: 2,
                "&:hover": {
                  bgcolor: "#388e3c",
                },
              }}
              onClick={createLiquidityPool}
              fullWidth
              disabled={loading.createLiquidityPool}
            >
              {loading.createLiquidityPool ? (
                <CircularProgress size={24} />
              ) : (
                "Create Liquidity Pool"
              )}
            </Button>
            <TextField
              label="Liquidity Pool ID"
              value={liquidityPoolId}
              onChange={(e) => setLiquidityPoolId(e.target.value)}
              fullWidth
              margin="normal"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Withdraw Amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              fullWidth
              margin="normal"
              type="number"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Button
              variant="outlined"
              sx={{
                color: "#d32f2f",
                borderColor: "#d32f2f",

                mb: 2,
                "&:hover": {
                  borderColor: "#d32f2f",
                },
              }}
              onClick={withdrawFromPool}
              fullWidth
              disabled={loading.withdrawFromPool}
            >
              {loading.withdrawFromPool ? (
                <CircularProgress size={24} />
              ) : (
                "Withdraw from Pool"
              )}
            </Button>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              bgcolor: "#e8f5e9",
              maxHeight: 400,
              overflow: "auto",
            }}
            elevation={2}
          >
            <Typography variant="h6" gutterBottom sx={{ color: "#388e3c" }}>
              Latest Log
            </Typography>
            <Typography variant="body2">{log}</Typography>
          </Paper>
        </Grid>
      </Paper>
    </Container>
  );
}

export default App;
