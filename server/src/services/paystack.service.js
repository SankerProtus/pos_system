const PAYSTACK_BASE_URL =
    process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";

const getAuthHeaders = () => {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
        throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }

    return {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
    };
};

export const paystackService = {
    initializeTransaction: async ({
        email,
        amount,
        channels = ["card"],
        reference,
        metadata = {},
    }) => {
        if (!email || !String(email).trim()) {
            throw new Error("Customer email is required for Paystack initialization");
        }

        const normalizedAmount = Number(amount);
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            throw new Error("Valid amount is required for Paystack initialization");
        }

        const url = `${PAYSTACK_BASE_URL}/transaction/initialize`;
        const payload = {
            email: String(email).trim(),
            amount: Math.round(normalizedAmount * 100),
            channels,
            reference,
            metadata,
            callback_url: process.env.PAYSTACK_CALLBACK_URL || process.env.CLIENT_URL,
        };

        const response = await fetch(url, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });

        const body = await response.json();

        if (!response.ok || body?.status !== true) {
            throw new Error(body?.message || "Paystack transaction initialization failed");
        }

        return body?.data || null;
    },

    verifyTransaction: async (reference) => {
        if (!reference || !String(reference).trim()) {
            throw new Error("Payment reference is required for Paystack verification");
        }

        const ref = String(reference).trim();
        const url = `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(ref)}`;

        const response = await fetch(url, {
            method: "GET",
            headers: getAuthHeaders(),
        });

        const payload = await response.json();

        if (!response.ok || payload?.status !== true) {
            throw new Error(payload?.message || "Paystack verification failed");
        }

        return payload?.data || null;
    },
};