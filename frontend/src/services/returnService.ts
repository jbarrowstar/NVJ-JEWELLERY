const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type Return = {
  _id?: string;
  orderId: string;
  invoiceNumber: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  items: {
    name: string;
    price: number;
    qty: number;
    sku: string;
  }[];
  grandTotal: number;
  returnReason: string;
  returnType: string;
  returnDate: string;
  returnTime: string;
  createdAt?: string;
  status?: string;
};

export interface ReturnsResponse {
  success: boolean;
  returns: Return[];
  message?: string;
}

export interface ReturnCheckResponse {
  success: boolean;
  exists: boolean;
  message?: string;
}

export interface CreateReturnResponse {
  success: boolean;
  return: Return;
  message?: string;
}

export interface DeleteReturnResponse {
  success: boolean;
  message?: string;
}

/**
 * Check if a return already exists for an order
 * Uses fallback method since dedicated endpoint doesn't exist
 */
export const checkReturnExists = async (orderId: string): Promise<boolean> => {
  try {
    console.log('Checking return existence for order:', orderId);
    
    // Direct fallback: fetch all returns and check locally
    // This is more reliable since the dedicated endpoint doesn't exist
    const returnsResponse = await fetchReturns();
    
    if (returnsResponse.success) {
      const existingReturn = returnsResponse.returns.find(
        (ret) => ret.orderId === orderId
      );
      
      const exists = !!existingReturn;
      console.log(`Return check result for ${orderId}:`, exists);
      return exists;
    }
    
    console.log('Failed to fetch returns, assuming no return exists');
    return false;
  } catch (err) {
    console.error('Return check error:', err);
    // If all methods fail, assume no return exists to allow the process to continue
    console.log('Return check failed, assuming no return exists');
    return false;
  }
};

/**
 * Fetch all returns
 */
export const fetchReturns = async (): Promise<ReturnsResponse> => {
  try {
    const res = await fetch(`${API_BASE}/returns`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch returns: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Fetch returns error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch returns');
  }
};

/**
 * Create a new return
 */
export const createReturn = async (returnData: Omit<Return, '_id' | 'createdAt'>): Promise<CreateReturnResponse> => {
  try {
    const res = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(returnData),
    });

    if (!res.ok) {
      throw new Error(`Failed to create return: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Create return error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to create return');
  }
};

/**
 * Fetch a specific return by ID
 */
export const fetchReturnById = async (id: string): Promise<{ success: boolean; return: Return }> => {
  try {
    const res = await fetch(`${API_BASE}/returns/${id}`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch return: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Fetch return by ID error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch return');
  }
};

/**
 * Delete a return by ID
 */
export const deleteReturn = async (id: string): Promise<DeleteReturnResponse> => {
  try {
    const res = await fetch(`${API_BASE}/returns/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error(`Failed to delete return: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Delete return error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to delete return');
  }
};

/**
 * Update a return's status
 */
export const updateReturnStatus = async (id: string, status: string): Promise<{ success: boolean; return: Return }> => {
  try {
    const res = await fetch(`${API_BASE}/returns/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error(`Failed to update return status: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Update return status error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to update return status');
  }
};

/**
 * Get returns statistics
 */
export const getReturnsStats = async (): Promise<{
  success: boolean;
  stats: {
    totalReturns: number;
    totalRefundAmount: number;
    pendingReturns: number;
    completedReturns: number;
  };
}> => {
  try {
    const res = await fetch(`${API_BASE}/returns/stats`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch returns stats: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Fetch returns stats error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch returns statistics');
  }
};