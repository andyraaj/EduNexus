/**
 * Error Handler Utility
 * Provides centralized error handling across the admin module and entire app.
 */

export interface AppError {
    message: string;
    code?: string;
    status?: number;
}

export const parseError = (error: any): AppError => {
    // Handle axios errors
    if (error?.response?.data?.error) {
        return {
            message: error.response.data.error.message || 'An error occurred',
            code: error.response.data.error.code,
            status: error.response.status,
        };
    }

    // Handle generic Error objects
    if (error instanceof Error) {
        return {
            message: error.message || 'An unexpected error occurred',
        };
    }

    // Handle string errors
    if (typeof error === 'string') {
        return { message: error };
    }

    // Default case
    return { message: 'An unexpected error occurred' };
};

export const showErrorToast = (error: any, defaultMsg = 'Failed to load data'): string => {
    const { message } = parseError(error);
    return message || defaultMsg;
};
