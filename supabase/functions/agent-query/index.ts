import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AgentRequest {
  query: string;
}

interface Document {
  id: string;
  filename: string;
  file_type: string;
  uploader_name: string;
  upload_date: string;
  summary: string | null;
  tags: string[];
}

function classifyIntent(query: string): string {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('last') || lowerQuery.includes('past')) {
    return 'find-recent';
  }

  if (lowerQuery.includes('summary') || lowerQuery.includes('summarize') || lowerQuery.includes('tell me about') || lowerQuery.includes('what are')) {
    return 'summarize-topic';
  }

  return 'find-document';
}

function extractTimeframe(query: string): number | null {
  const patterns = [
    { regex: /(\d+)\s*days?/i, multiplier: 1 },
    { regex: /(\d+)\s*weeks?/i, multiplier: 7 },
    { regex: /(\d+)\s*months?/i, multiplier: 30 },
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern.regex);
    if (match) {
      return parseInt(match[1]) * pattern.multiplier;
    }
  }

  return null;
}

function extractUploader(query: string): string | null {
  const patterns = [
    /from\s+(\w+)/i,
    /by\s+(\w+)/i,
    /(\w+)'s/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
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

    const { query }: AgentRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'query is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const intent = classifyIntent(query);
    const timeframe = extractTimeframe(query);
    const uploader = extractUploader(query);

    await supabase.from('search_logs').insert({
      query,
      intent,
      search_type: 'agentic',
    });

    const model = new Supabase.ai.Session('gte-small');
    let documents: Document[] = [];
    let response = '';

    if (intent === 'find-recent') {
      const daysBack = timeframe || 10;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      let queryBuilder = supabase
        .from('documents')
        .select('*')
        .gte('upload_date', cutoffDate.toISOString())
        .order('upload_date', { ascending: false });

      if (uploader) {
        queryBuilder = queryBuilder.ilike('uploader_name', `%${uploader}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      documents = data || [];

      if (documents.length === 0) {
        response = `No documents found in the last ${daysBack} days${uploader ? ` from ${uploader}` : ''}.`;
      } else {
        response = `Found ${documents.length} document${documents.length !== 1 ? 's' : ''} from the last ${daysBack} days${uploader ? ` from ${uploader}` : ''}:\n\n`;
        documents.forEach((doc, idx) => {
          const date = new Date(doc.upload_date);
          const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
          response += `${idx + 1}. **${doc.filename}** (${doc.file_type.toUpperCase()})\n`;
          response += `   Uploaded by ${doc.uploader_name} - ${daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}\n`;
          if (doc.summary) {
            response += `   ${doc.summary.substring(0, 150)}${doc.summary.length > 150 ? '...' : ''}\n`;
          }
          response += '\n';
        });
      }
    } else if (intent === 'summarize-topic') {
      const { data: chunkCount } = await supabase
        .from('document_chunks')
        .select('id', { count: 'exact', head: true });

      let documentIds: string[] = [];

      if (chunkCount && chunkCount.length > 0) {
        const queryEmbedding = await model.run(query, { mean_pool: true, normalize: true });

        const { data: chunks, error: chunkError } = await supabase.rpc('match_document_chunks', {
          query_embedding: `[${queryEmbedding.data.join(',')}]`,
          match_threshold: 0.5,
          match_count: 15,
        });

        if (!chunkError && chunks) {
          documentIds = [...new Set((chunks || []).map((c: any) => c.document_id))];
        }
      }

      if (documentIds.length === 0) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .or(`filename.ilike.%${query}%,summary.ilike.%${query}%,tags.cs.{${query}}`)
          .eq('processing_status', 'completed')
          .order('upload_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        documents = data || [];
      } else {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .in('id', documentIds)
          .eq('processing_status', 'completed')
          .order('upload_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        documents = data || [];
      }

      if (documents.length === 0) {
        response = `I couldn't find any documents related to "${query}". Try uploading relevant documents or refining your search.`;
      } else {
        response = `Here's what I found about "${query}":\n\n`;
        response += `**Summary based on ${documents.length} document${documents.length !== 1 ? 's' : ''}:**\n\n`;

        const uniqueTags = [...new Set(documents.flatMap(d => d.tags))];
        if (uniqueTags.length > 0) {
          response += `Key topics: ${uniqueTags.join(', ')}\n\n`;
        }

        documents.slice(0, 5).forEach((doc, idx) => {
          response += `${idx + 1}. **${doc.filename}**\n`;
          if (doc.summary) {
            response += `   ${doc.summary}\n`;
          }
          response += '\n';
        });

        if (documents.length > 5) {
          response += `\nAnd ${documents.length - 5} more related documents...`;
        }
      }
    } else {
      const { data: chunkCount } = await supabase
        .from('document_chunks')
        .select('id', { count: 'exact', head: true });

      let documentIds: string[] = [];

      if (chunkCount && chunkCount.length > 0) {
        const queryEmbedding = await model.run(query, { mean_pool: true, normalize: true });

        const { data: chunks, error: chunkError } = await supabase.rpc('match_document_chunks', {
          query_embedding: `[${queryEmbedding.data.join(',')}]`,
          match_threshold: 0.5,
          match_count: 30,
        });

        if (!chunkError && chunks) {
          documentIds = [...new Set((chunks || []).map((c: any) => c.document_id))];
        }
      }

      if (documentIds.length === 0) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .or(`filename.ilike.%${query}%,summary.ilike.%${query}%,tags.cs.{${query}}`)
          .eq('processing_status', 'completed')
          .order('upload_date', { ascending: false })
          .limit(20);

        if (error) throw error;
        documents = data || [];
      } else {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .in('id', documentIds)
          .eq('processing_status', 'completed')
          .order('upload_date', { ascending: false })
          .limit(20);

        if (error) throw error;
        documents = data || [];
      }

      if (documents.length === 0) {
        response = `No documents found matching "${query}". Try different keywords or check recent uploads.`;
      } else {
        response = `Found ${documents.length} document${documents.length !== 1 ? 's' : ''} matching "${query}":\n\n`;
        documents.forEach((doc, idx) => {
          response += `${idx + 1}. **${doc.filename}** (${doc.file_type.toUpperCase()})\n`;
          response += `   By ${doc.uploader_name}\n`;
          if (doc.summary) {
            response += `   ${doc.summary.substring(0, 150)}${doc.summary.length > 150 ? '...' : ''}\n`;
          }
          response += '\n';
        });
      }
    }

    await supabase
      .from('search_logs')
      .update({ results_count: documents.length })
      .eq('query', query)
      .order('created_at', { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({
        query,
        intent,
        response,
        documents,
        count: documents.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Agent query error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Query failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});