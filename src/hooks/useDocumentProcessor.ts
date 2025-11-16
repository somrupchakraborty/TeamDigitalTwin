import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useDocumentProcessor() {
  useEffect(() => {
    const channel = supabase
      .channel('document-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents',
        },
        async (payload) => {
          const document = payload.new;

          if (document.processing_status === 'pending') {
            try {
              const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document`;

              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ documentId: document.id }),
              });

              if (!response.ok) {
                console.error('Failed to trigger processing:', await response.text());
              }
            } catch (error) {
              console.error('Error triggering document processing:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
