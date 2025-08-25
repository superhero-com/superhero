import { useContext } from "react";
import { AeSdkContext } from "../context/AeSdkProvider";

export const useAeSdk = () => {
    const context = useContext(AeSdkContext);
    if (!context) {
        throw new Error("useAeSdk must be used within an AeSdkProvider");
    }
    return context;
};