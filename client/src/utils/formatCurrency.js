export const formatCurrency = (amount) => {
  return `GH₵ ${Number(amount).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
