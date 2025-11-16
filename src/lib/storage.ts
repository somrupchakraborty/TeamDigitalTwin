let bucketInitialized = false;

export async function ensureStorageBucket() {
  if (bucketInitialized) return { success: true };

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/init-storage`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error initializing storage:', error);
      return { success: false, error };
    }

    const result = await response.json();

    if (result.success || result.error?.includes('already exists')) {
      bucketInitialized = true;
      return { success: true };
    }

    return { success: false, error: result.error };
  } catch (error) {
    console.error('Storage initialization error:', error);
    return { success: false, error };
  }
}
