"use client";

import { SimpleWalletProvider as Provider } from "./SimpleWalletProvider";

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
    return <Provider>{children}</Provider>;
};
