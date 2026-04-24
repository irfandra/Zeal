import { apiRequest } from './apiClient';

const normalizeWallet = (value) => String(value || '').trim().toLowerCase();

export const transferService = {
  async getTransferRecipients() {
    try {
      const recipients = await apiRequest('/transfers/recipients', {
        authRequired: true,
      });
      return Array.isArray(recipients) ? recipients : [];
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      const isEndpointMissing = message.includes('not found') || message.includes('404');
      if (!isEndpointMissing) {
        throw error;
      }

      const recipients = await apiRequest('/users/transfer-recipients', {
        authRequired: true,
      });
      return Array.isArray(recipients) ? recipients : [];
    }
  },

  async createTransferRequest({ itemId, recipientWallet }) {
    const parsedItemId = Number(itemId);
    if (!Number.isFinite(parsedItemId)) {
      throw new Error('Invalid item selected for transfer.');
    }

    const normalizedRecipientWallet = normalizeWallet(recipientWallet);
    if (!normalizedRecipientWallet) {
      throw new Error('Recipient wallet is required.');
    }

    return apiRequest('/transfers/requests', {
      method: 'POST',
      authRequired: true,
      body: {
        itemId: parsedItemId,
        recipientWallet: normalizedRecipientWallet,
      },
    });
  },

  async getIncomingTransferRequests() {
    return apiRequest('/transfers/requests/incoming', {
      authRequired: true,
    });
  },

  async getOutgoingTransferRequests() {
    return apiRequest('/transfers/requests/outgoing', {
      authRequired: true,
    });
  },

  async approveTransferRequest(requestId) {
    const parsedId = Number(requestId);
    if (!Number.isFinite(parsedId)) {
      throw new Error('Invalid transfer request id.');
    }

    return apiRequest(`/transfers/requests/${parsedId}/approve`, {
      method: 'POST',
      authRequired: true,
    });
  },

  async rejectTransferRequest(requestId) {
    const parsedId = Number(requestId);
    if (!Number.isFinite(parsedId)) {
      throw new Error('Invalid transfer request id.');
    }

    return apiRequest(`/transfers/requests/${parsedId}/reject`, {
      method: 'POST',
      authRequired: true,
    });
  },
};
