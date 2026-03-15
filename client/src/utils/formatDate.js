export const formatDate = {
  receitDateFormat: (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString("en-US", options);
  },

  reportDateFormat: (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString("en-US", options);
  },

  standard: (dateString) => {
    // dd/MM/yyyy HH:mm format
    const date = new Date(dateString);
    const pad = (n) => n.toString().padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  dateOnly: (dateString) => {
    // dd/MM/yyyy format
    const date = new Date(dateString);
    const pad = (n) => n.toString().padStart(2, '0');

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  },

  timeOnly: (dateString) => {
    // HH:mm format
    const date = new Date(dateString);
    const pad = (n) => n.toString().padStart(2, '0');

    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  iso: (dateString) => {
    // yyyy-MM-dd format (for date inputs)
    const date = new Date(dateString);
    const pad = (n) => n.toString().padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  },
};