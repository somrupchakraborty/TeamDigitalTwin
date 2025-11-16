import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SearchRequest {
  query: string;
  limit?: number;
  fileType?: string;
  uploaderName?: string;
  daysBack?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, limit = 20, fileType, uploaderName, daysBack }: SearchRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'query is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await supabase.from('search_logs').insert({
      query,
      search_type: 'semantic',
    });

    const model = new Supabase.ai.Session('gte-small');
    const queryEmbedding = await model.run(query, { mean_pool: true, normalize: true });

    const { data: chunks, error: chunkError } = await supabase.rpc('match_document_chunks', {
      query_embedding: `[${queryEmbedding.data.join(',')}]`,
      match_threshold: 0.5,
      match_count: limit * 3,
    });

    if (chunkError) {
      throw chunkError;
    }

    const documentIds = [...new Set((chunks || []).map((c: any) => c.document_id))];

    let queryBuilder = supabase
      .from('documents')
      .select('*')
      .in('id', documentIds.length > 0 ? documentIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('processing_status', 'completed');

    if (fileType) {
      queryBuilder = queryBuilder.eq('file_type', fileType);
    }

    if (uploaderName) {
      queryBuilder = queryBuilder.ilike('uploader_name', `%${uploaderName}%`);
    }

    if (daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      queryBuilder = queryBuilder.gte('upload_date', cutoffDate.toISOString());
    }

    const { data: documents, error: searchError } = await queryBuilder
      .order('upload_date', { ascending: false })
      .limit(limit);

    if (searchError) {
      throw searchError;
    }

    await supabase
      .from('search_logs')
      .update({ results_count: documents?.length || 0 })
      .eq('query', query)
      .order('created_at', { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({
        results: documents || [],
        count: documents?.length || 0,
        query,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Search failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});