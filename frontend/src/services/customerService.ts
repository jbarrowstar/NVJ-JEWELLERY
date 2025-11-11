const API_BASE = import.meta.env.VITE_API_BASE_URL;

export interface Customer {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerResponse {
  success: boolean;
  customer: Customer;
  message?: string;
}

export interface CustomersResponse {
  success: boolean;
  customers: Customer[];
  message?: string;
}

export interface DeleteCustomerResponse {
  success: boolean;
  message?: string;
}

/**
 * Fetch all customers
 */
export const fetchCustomers = async (): Promise<CustomersResponse> => {
  try {
    const res = await fetch(`${API_BASE}/customers`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch customers: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Fetch customers error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch customers');
  }
};

/**
 * Save a new customer
 */
export const saveCustomer = async (customer: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>): Promise<CustomerResponse> => {
  try {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customer),
    });

    if (!res.ok) {
      throw new Error(`Failed to save customer: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Save customer error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to save customer');
  }
};

/**
 * Update an existing customer
 */
export const updateCustomer = async (id: string, customer: Partial<Customer>): Promise<CustomerResponse> => {
  try {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customer),
    });

    if (!res.ok) {
      throw new Error(`Failed to update customer: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Update customer error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to update customer');
  }
};

/**
 * Delete a customer by ID
 */
export const deleteCustomer = async (id: string): Promise<DeleteCustomerResponse> => {
  try {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error(`Failed to delete customer: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Delete customer error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to delete customer');
  }
};

/**
 * Fetch a specific customer by ID
 */
export const fetchCustomerById = async (id: string): Promise<CustomerResponse> => {
  try {
    const res = await fetch(`${API_BASE}/customers/${id}`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch customer: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Fetch customer by ID error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch customer');
  }
};

/**
 * Search customers by query
 */
export const searchCustomers = async (query: string): Promise<CustomersResponse> => {
  try {
    const res = await fetch(`${API_BASE}/customers/search?q=${encodeURIComponent(query)}`);
    
    if (!res.ok) {
      throw new Error(`Failed to search customers: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Search customers error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to search customers');
  }
};

/**
 * Get customer statistics
 */
export const getCustomerStats = async (): Promise<{
  success: boolean;
  stats: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    activeCustomers: number;
  };
}> => {
  try {
    const res = await fetch(`${API_BASE}/customers/stats`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch customer stats: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from server');
    }

    return await res.json();
  } catch (err) {
    console.error('Fetch customer stats error:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch customer statistics');
  }
};